import type { Stargazer, ReleaseAsset, RepoRelease } from "@/types/github";
import { config } from "@/lib/config";

export type { Stargazer, ReleaseAsset, RepoRelease };

const REPO = config.github.client.fullName;
const BASE = "https://api.github.com";

function headers(token?: string): HeadersInit {
	const h: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	};
	if (token) h["Authorization"] = `Bearer ${token}`;
	return h;
}

async function fetchWithFallback(
	path: string,
	token?: string,
): Promise<Response | null> {
	try {
		const res = await fetch(`${BASE}${path}`, { headers: headers(token) });
		if (res.ok) return res;
	} catch {}
	return null;
}

export async function fetchStargazers(): Promise<Stargazer[]> {
	if (!config.supabase.url) return [];
	try {
		const res = await fetch(`${config.supabase.url}/functions/v1/stargazers`, {
			headers: {
				apikey: config.supabase.anonKey ?? "",
				Authorization: `Bearer ${config.supabase.anonKey ?? ""}`,
			},
		});
		if (!res.ok) return [];
		const json = await res.json();
		return Array.isArray(json.stargazers) ? json.stargazers : [];
	} catch {
		return [];
	}
}

export async function fetchLatestRelease(
	token?: string,
): Promise<RepoRelease | null> {
	const res = await fetchWithFallback(`/repos/${REPO}/releases/latest`, token);
	if (!res) return null;
	return res.json();
}

export function findAsset(
	assets: ReleaseAsset[],
	ext: string,
): ReleaseAsset | undefined {
	return assets.find((a) => a.name.endsWith(ext));
}

export function formatSize(bytes: number): string {
	const mb = bytes / 1024 / 1024;
	return mb >= 1 ? `${mb.toFixed(0)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}
