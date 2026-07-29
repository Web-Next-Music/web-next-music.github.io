import type { GHTreeResponse } from "@/types/github";

const HOUR = 60 * 60 * 1000;
export const CONTENTS_TTL = 6 * HOUR;
export const UPDATE_TTL = 1 * HOUR;
export const META_TTL = 6 * HOUR;

const CACHE_KEY = "nextmusic_gh_req_cache";
const CACHE_VERSION = 1;

interface CacheEntry {
	data: unknown;
	etag?: string;
	timestamp: number;
}

interface CacheStore {
	version: number;
	entries: Record<string, CacheEntry>;
}

function loadStore(): CacheStore {
	if (typeof window === "undefined")
		return { version: CACHE_VERSION, entries: {} };
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		if (!raw) return { version: CACHE_VERSION, entries: {} };
		const parsed: CacheStore = JSON.parse(raw);
		if (parsed.version !== CACHE_VERSION)
			return { version: CACHE_VERSION, entries: {} };
		return parsed;
	} catch {
		return { version: CACHE_VERSION, entries: {} };
	}
}

function saveStore(store: CacheStore) {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(store));
	} catch {}
}

function getEntry(key: string): CacheEntry | null {
	return loadStore().entries[key] ?? null;
}

function setEntry(key: string, data: unknown, etag?: string | null) {
	const store = loadStore();
	store.entries[key] = { data, etag: etag ?? undefined, timestamp: Date.now() };
	saveStore(store);
}

function touchEntry(key: string) {
	const store = loadStore();
	const entry = store.entries[key];
	if (!entry) return;
	entry.timestamp = Date.now();
	saveStore(store);
}

function isFresh(entry: CacheEntry | null, ttl: number): boolean {
	return !!entry && Date.now() - entry.timestamp < ttl;
}

export class RateLimitError extends Error {
	resetAt: number;
	constructor(resetAt: number) {
		super("GitHub API rate limit exceeded");
		this.name = "RateLimitError";
		this.resetAt = resetAt;
	}
}

const rateLimitState = { remaining: null as number | null, resetAt: 0 };

function getRateLimitState() {
	const limited =
		rateLimitState.remaining === 0 && Date.now() < rateLimitState.resetAt;
	return { limited, resetAt: limited ? rateLimitState.resetAt : 0 };
}

function noteRateLimit(headers: Headers) {
	const remaining = headers.get("x-ratelimit-remaining");
	const reset = headers.get("x-ratelimit-reset");
	if (remaining !== null) rateLimitState.remaining = Number(remaining);
	if (reset !== null) rateLimitState.resetAt = Number(reset) * 1000;
}

function isRateLimitResponse(
	status: number,
	headers: Headers,
	body: string,
): boolean {
	if (status !== 403 && status !== 429) return false;
	if (headers.get("x-ratelimit-remaining") === "0") return true;
	return /rate limit/i.test(body);
}

function ghHeaders(token?: string): Record<string, string> {
	const h: Record<string, string> = {
		Accept: "application/vnd.github.v3+json",
	};
	if (token) h["Authorization"] = `Bearer ${token}`;
	return h;
}

const inflight = new Map<string, Promise<unknown>>();

export function ghFetch<T>(
	url: string,
	opts: { token?: string; ttl: number; api?: boolean } = { ttl: CONTENTS_TTL },
): Promise<T> {
	const { token, ttl, api = true } = opts;
	const pending = inflight.get(url);
	if (pending) return pending as Promise<T>;

	const request = fetchWithCache<T>(url, token, ttl, api).finally(() => {
		inflight.delete(url);
	});
	inflight.set(url, request);
	return request;
}

async function fetchWithCache<T>(
	url: string,
	token: string | undefined,
	ttl: number,
	api: boolean,
): Promise<T> {
	const entry = getEntry(url);

	if (isFresh(entry, ttl)) return entry!.data as T;

	if (api) {
		const state = getRateLimitState();
		if (state.limited) {
			if (entry) return entry.data as T;
			throw new RateLimitError(state.resetAt);
		}
	}

	const headers: Record<string, string> = api ? ghHeaders(token) : {};
	if (entry?.etag) headers["If-None-Match"] = entry.etag;

	const res = await fetch(url, { headers });
	if (api) noteRateLimit(res.headers);

	if (res.status === 304 && entry) {
		touchEntry(url);
		return entry.data as T;
	}

	if (api) {
		const bodyText = res.ok ? "" : await res.clone().text();
		if (isRateLimitResponse(res.status, res.headers, bodyText)) {
			rateLimitState.remaining = 0;
			if (entry) return entry.data as T;
			throw new RateLimitError(rateLimitState.resetAt);
		}
	}

	if (!res.ok) throw new Error(`GitHub ${res.status}: ${url}`);

	const contentType = res.headers.get("content-type") ?? "";
	const data = (
		contentType.includes("json") ? await res.json() : await res.text()
	) as T;

	setEntry(url, data, res.headers.get("etag"));
	return data;
}

export async function repoTree(
	owner: string,
	repo: string,
	token?: string,
): Promise<string[] | null> {
	try {
		const data = await ghFetch<GHTreeResponse>(
			`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
			{ token, ttl: CONTENTS_TTL },
		);
		if (!Array.isArray(data?.tree) || data.truncated) return null;
		return data.tree.filter((n) => n.type === "blob").map((n) => n.path);
	} catch {
		return null;
	}
}
