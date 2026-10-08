import type { LegacyTrack } from "@/types/track";

export function parseLegacy(data: unknown): LegacyTrack[] {
	if (!data || typeof data !== "object" || !("tracks" in data)) {
		throw new Error("Invalid track list: missing tracks");
	}
	const tracks = data.tracks;
	if (!tracks || typeof tracks !== "object" || Array.isArray(tracks)) {
		throw new Error("Invalid track list: tracks must be an object");
	}
	return Object.entries(tracks).map(([id, url]) => {
		if (!id.trim() || typeof url !== "string" || !url.trim()) {
			throw new Error("Invalid track list entry");
		}
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			throw new Error(`Invalid track URL: ${id}`);
		}
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
			throw new Error(`Invalid track URL protocol: ${id}`);
		}
		return { id, url, yandexUrl: `https://music.yandex.ru/track/${id}` };
	});
}
