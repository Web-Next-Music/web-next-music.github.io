import { getSupabase } from "./supabase";

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

export async function checkDDetectorAccess(userId: string): Promise<boolean> {
	try {
		const sb = getSupabase();
		if (!sb) return false;
		const { data, error } = await sb
			.from("ddetector_users")
			.select("user_id")
			.eq("user_id", userId)
			.maybeSingle();
		if (error) return false;
		return data !== null;
	} catch {
		return false;
	}
}

export async function fetchDDetectorTracks(): Promise<DDetectorTrack[]> {
	try {
		const sb = getSupabase();
		if (!sb) return [];
		const PAGE = 1000;
		const all: DDetectorTrack[] = [];
		let offset = 0;
		while (true) {
			const { data, error } = await sb
				.from("ddetector_tracks")
				.select("id, title, artist, cover, added_at")
				.order("added_at", { ascending: false })
				.range(offset, offset + PAGE - 1);
			if (error) {
				console.error("fetchDDetectorTracks:", error.message);
				break;
			}
			all.push(...((data ?? []) as DDetectorTrack[]));
			if ((data ?? []).length < PAGE) break;
			offset += PAGE;
		}
		return all;
	} catch (e) {
		console.error("fetchDDetectorTracks:", e);
		return [];
	}
}

export async function fetchDDetectorLyrics(): Promise<
	Map<number, LyricLine[] | null>
> {
	try {
		const sb = getSupabase();
		if (!sb) return new Map();
		const PAGE = 1000;
		const map = new Map<number, LyricLine[] | null>();
		let offset = 0;
		while (true) {
			const { data, error } = await sb
				.from("ddetector_lyrics_cache")
				.select("track_id, lyrics")
				.range(offset, offset + PAGE - 1);
			if (error) {
				console.error("fetchDDetectorLyrics:", error.message);
				break;
			}
			for (const row of data ?? []) {
				map.set(
					(row as DDetectorLyricsEntry).track_id,
					(row as DDetectorLyricsEntry).lyrics,
				);
			}
			if ((data ?? []).length < PAGE) break;
			offset += PAGE;
		}
		return map;
	} catch (e) {
		console.error("fetchDDetectorLyrics:", e);
		return new Map();
	}
}

export async function fetchIgnoredTrackIds(): Promise<Set<number>> {
	try {
		const sb = getSupabase();
		if (!sb) return new Set();
		const { data, error } = await sb
			.from("ddetector_ignored_tracks")
			.select("track_id");
		if (error) return new Set();
		return new Set((data ?? []).map((r: { track_id: number }) => r.track_id));
	} catch {
		return new Set();
	}
}

export async function addIgnoredTrack(trackId: number): Promise<boolean> {
	try {
		const sb = getSupabase();
		if (!sb) return false;
		const { error } = await sb
			.from("ddetector_ignored_tracks")
			.insert({ track_id: trackId });
		return !error;
	} catch {
		return false;
	}
}

export async function removeIgnoredTrack(trackId: number): Promise<boolean> {
	try {
		const sb = getSupabase();
		if (!sb) return false;
		const { error } = await sb
			.from("ddetector_ignored_tracks")
			.delete()
			.eq("track_id", trackId);
		return !error;
	} catch {
		return false;
	}
}

export async function triggerDDetectorFetch(accessToken: string): Promise<{
	ok: boolean;
	total?: number;
	added?: number;
	removed?: number;
	lyrics_fetched?: number;
	error?: string;
	_debug?: unknown;
}> {
	try {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		if (!supabaseUrl)
			return { ok: false, error: "NEXT_PUBLIC_SUPABASE_URL not set" };

		const res = await fetch(`${supabaseUrl}/functions/v1/ddetector-fetch`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		});

		const json = await res.json().catch(() => ({}));
		if (!res.ok)
			return {
				ok: false,
				error: (json as { error?: string }).error ?? `HTTP ${res.status}`,
			};
		return { ok: true, ...(json as object) };
	} catch (e) {
		return { ok: false, error: String(e) };
	}
}
