export interface LrcLine {
	time: number;
	text: string;
}

export interface LrcResult {
	synced: LrcLine[] | null;
	plain: string | null;
	found: boolean;
}

interface LyricsResponse {
	statusCode?: number;
	syncedLyrics?: string | null;
	plainLyrics?: string | null;
}

function parseLrc(raw: string): LrcLine[] {
	const lines: LrcLine[] = [];
	const re = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
	for (const line of raw.split("\n")) {
		const match = line.match(re);
		if (!match) continue;
		const min = Number.parseInt(match[1], 10);
		const sec = Number.parseInt(match[2], 10);
		const ms = Number.parseInt(match[3].padEnd(3, "0"), 10);
		const text = match[4].trim();
		if (text) lines.push({ time: min * 60 + sec + ms / 1000, text });
	}
	return lines;
}

function isLyricsResponse(value: unknown): value is LyricsResponse {
	return typeof value === "object" && value !== null;
}

function parseLyrics(value: unknown): LrcResult | null {
	if (!isLyricsResponse(value) || value.statusCode === 404) return null;
	const parsed =
		typeof value.syncedLyrics === "string"
			? parseLrc(value.syncedLyrics)
			: null;
	const synced = parsed?.length ? parsed : null;
	const plain =
		typeof value.plainLyrics === "string"
			? value.plainLyrics.trim() || null
			: null;
	if (!synced && !plain) return null;
	return { synced, plain, found: true };
}

export async function fetchLyrics(
	title: string,
	artist: string,
	signal?: AbortSignal,
): Promise<LrcResult> {
	const empty: LrcResult = { synced: null, plain: null, found: false };
	try {
		const query = new URLSearchParams({
			track_name: title,
			artist_name: artist,
		});
		const exact = await fetch(`https://lrclib.net/api/get?${query}`, {
			signal,
		});
		if (exact.ok) {
			const result = parseLyrics(await exact.json());
			if (result) return result;
		}

		const search = await fetch(`https://lrclib.net/api/search?${query}`, {
			signal,
		});
		if (!search.ok) return empty;
		const results: unknown = await search.json();
		if (!Array.isArray(results)) return empty;
		const best = results.find((item) => !!parseLyrics(item)?.synced);
		return parseLyrics(best ?? results[0]) ?? empty;
	} catch {
		return empty;
	}
}
