import { config } from "@/lib/config";

const REPO = config.github.client.fullName;
const BASE = "https://api.github.com";
const PER_PAGE = 100;
const MAX_PAGES = 10;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_KEY = `la-client-tags:${REPO}`;

function headers(token?: string): HeadersInit {
	const h: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	};
	if (token) h["Authorization"] = `Bearer ${token}`;
	return h;
}

function readCache(): string[] | null {
	if (typeof sessionStorage === "undefined") return null;
	try {
		const raw = sessionStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { tags: string[]; ts: number };
		if (!Array.isArray(parsed.tags) || Date.now() - parsed.ts > CACHE_TTL_MS)
			return null;
		return parsed.tags;
	} catch {
		return null;
	}
}

function writeCache(tags: string[]) {
	if (typeof sessionStorage === "undefined") return;
	try {
		sessionStorage.setItem(CACHE_KEY, JSON.stringify({ tags, ts: Date.now() }));
	} catch {}
}

export async function fetchClientTags(token?: string): Promise<string[]> {
	const cached = readCache();
	if (cached) return cached;

	const tags: string[] = [];

	try {
		for (let page = 1; page <= MAX_PAGES; page++) {
			const res = await fetch(
				`${BASE}/repos/${REPO}/tags?per_page=${PER_PAGE}&page=${page}`,
				{ headers: headers(token) },
			);
			if (!res.ok) break;

			const data = await res.json();
			if (!Array.isArray(data) || data.length === 0) break;

			for (const t of data as { name?: string }[]) {
				if (t.name) tags.push(t.name);
			}

			if (data.length < PER_PAGE) break;
		}
	} catch {}

	if (tags.length > 0) writeCache(tags);
	return tags;
}
