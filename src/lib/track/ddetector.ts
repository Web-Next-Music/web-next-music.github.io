import { getSupabase } from "@/lib/supabase";

export interface DDetectorTrack {
	id: number;
	title: string;
	artist: string;
	cover: string | null;
	added_at: string | null;
}
export interface LyricLine {
	ts: string | null;
	text: string;
}
export interface DDetectorLyricsEntry {
	track_id: number;
	lyrics: LyricLine[] | null;
}
function client() {
	const sb = getSupabase();
	if (!sb) throw new Error("Supabase is unavailable");
	return sb;
}
export async function checkDDetectorAccess(userId: string): Promise<boolean> {
	const { data, error } = await client()
		.from("ddetector_users")
		.select("user_id")
		.eq("user_id", userId)
		.maybeSingle();
	if (error) throw error;
	return data !== null;
}
async function rows<T>(
	table:
		"ddetector_tracks" | "ddetector_lyrics_cache" | "ddetector_ignored_tracks",
	columns: string,
	key: string,
	byDate = false,
): Promise<T[]> {
	const sb = client();
	const all: T[] = [];
	const size = 1000;
	for (let offset = 0; ; offset += size) {
		let query = sb.from(table).select(columns);
		if (byDate) query = query.order("added_at", { ascending: false });
		const { data, error } = await query
			.order(key, { ascending: true })
			.range(offset, offset + size - 1);
		if (error) throw error;
		all.push(...((data as unknown as T[]) ?? []));
		if (!data || data.length < size) return all;
	}
}
export function fetchDDetectorTracks(): Promise<DDetectorTrack[]> {
	return rows(
		"ddetector_tracks",
		"id, title, artist, cover, added_at",
		"id",
		true,
	);
}
export async function fetchDDetectorLyrics(): Promise<
	Map<number, LyricLine[] | null>
> {
	return new Map(
		(
			await rows<DDetectorLyricsEntry>(
				"ddetector_lyrics_cache",
				"track_id, lyrics",
				"track_id",
			)
		).map((row) => [row.track_id, row.lyrics]),
	);
}
export async function fetchIgnoredTrackIds(): Promise<Set<number>> {
	return new Set(
		(
			await rows<{ track_id: number }>(
				"ddetector_ignored_tracks",
				"track_id",
				"track_id",
			)
		).map((row) => row.track_id),
	);
}
export async function addIgnoredTrack(trackId: number): Promise<boolean> {
	const { error } = await client()
		.from("ddetector_ignored_tracks")
		.insert({ track_id: trackId });
	if (error) throw error;
	return true;
}
export async function removeIgnoredTrack(trackId: number): Promise<boolean> {
	const { error } = await client()
		.from("ddetector_ignored_tracks")
		.delete()
		.eq("track_id", trackId);
	if (error) throw error;
	return true;
}
export async function triggerDDetectorFetch(accessToken: string): Promise<{
	ok: boolean;
	total?: number;
	added?: number;
	removed?: number;
	lyrics_fetched?: number;
	error?: string;
}> {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL not set");
	const res = await fetch(`${url}/functions/v1/ddetector-fetch`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
	});
	const json = await res.json();
	if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
	return { ...json, ok: true };
}
