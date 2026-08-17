import { config } from "@/lib/config";

const REPO = config.github.client.fullName;
const BASE = "https://api.github.com";
const PER_PAGE = 100;
const MAX_PAGES = 10;

function headers(token?: string): HeadersInit {
	const h: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	};
	if (token) h["Authorization"] = `Bearer ${token}`;
	return h;
}

export async function fetchClientTags(token?: string): Promise<string[]> {
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

	return tags;
}
