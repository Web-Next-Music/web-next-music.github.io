import { getSupabase } from ".";

export interface Playlist {
	id: string;
	name: string;
	created_at: string;
	track_count?: number;
}

export interface PlaylistTrack {
	id: string;
	playlist_id: string;
	track_id: string;
	position: number;
}

export async function getPlaylistDetail(
	userId: string,
	playlistId: string,
): Promise<{ playlist: Playlist; tracks: PlaylistTrack[] } | null> {
	const sb = getSupabase();
	if (!sb) throw new Error("Playlist service is unavailable");
	const { data: playlist, error } = await sb
		.from("playlists")
		.select("id, name, created_at")
		.eq("user_id", userId)
		.eq("id", playlistId)
		.maybeSingle();
	if (error) throw error;
	if (!playlist) return null;
	const { data: tracks, error: tracksError } = await sb
		.from("playlist_tracks")
		.select("id, playlist_id, track_id, position")
		.eq("playlist_id", playlistId)
		.order("position", { ascending: true });
	if (tracksError) throw tracksError;
	return {
		playlist: playlist as Playlist,
		tracks: (tracks ?? []) as PlaylistTrack[],
	};
}

export async function removePlaylistDetailTrack(
	playlistId: string,
	trackId: string,
): Promise<void> {
	const sb = getSupabase();
	if (!sb) throw new Error("Playlist service is unavailable");
	const { data, error } = await sb
		.from("playlist_tracks")
		.delete()
		.eq("playlist_id", playlistId)
		.eq("track_id", trackId)
		.select("id");
	if (error) throw error;
	if (!data?.length) throw new Error("Track was not removed");
}

export async function getPlaylists(userId: string): Promise<Playlist[]> {
	const sb = getSupabase();
	if (!sb) return [];
	const { data, error } = await sb
		.from("playlists")
		.select("id, name, created_at")
		.eq("user_id", userId)
		.order("created_at", { ascending: false });
	if (error) console.error("[playlists] getPlaylists:", error.message);
	return (data ?? []) as Playlist[];
}

export async function createPlaylist(
	userId: string,
	name: string,
): Promise<Playlist | null> {
	const sb = getSupabase();
	if (!sb) return null;
	const { data, error } = await sb
		.from("playlists")
		.insert({ user_id: userId, name })
		.select("id, name, created_at")
		.single();
	if (error) console.error("[playlists] createPlaylist:", error.message);
	return (data ?? null) as Playlist | null;
}

export async function deletePlaylist(playlistId: string): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) return false;
	const { error } = await sb.from("playlists").delete().eq("id", playlistId);
	if (error) console.error("[playlists] deletePlaylist:", error.message);
	return !error;
}

export async function renamePlaylist(
	playlistId: string,
	name: string,
): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) return false;
	const { error } = await sb
		.from("playlists")
		.update({ name })
		.eq("id", playlistId);
	if (error) console.error("[playlists] renamePlaylist:", error.message);
	return !error;
}

export async function getPlaylistTracks(
	playlistId: string,
): Promise<PlaylistTrack[]> {
	const sb = getSupabase();
	if (!sb) return [];
	const { data, error } = await sb
		.from("playlist_tracks")
		.select("id, playlist_id, track_id, position")
		.eq("playlist_id", playlistId)
		.order("position", { ascending: true });
	if (error) console.error("[playlists] getPlaylistTracks:", error.message);
	return (data ?? []) as PlaylistTrack[];
}

export async function addTrackToPlaylist(
	playlistId: string,
	trackId: string,
	position: number,
): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) return false;
	const { error } = await sb
		.from("playlist_tracks")
		.upsert(
			{ playlist_id: playlistId, track_id: trackId, position },
			{ onConflict: "playlist_id,track_id", ignoreDuplicates: true },
		);
	if (error) console.error("[playlists] addTrackToPlaylist:", error.message);
	return !error;
}

export async function removeTrackFromPlaylist(
	playlistId: string,
	trackId: string,
): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) return false;
	const { error } = await sb
		.from("playlist_tracks")
		.delete()
		.eq("playlist_id", playlistId)
		.eq("track_id", trackId);
	if (error)
		console.error("[playlists] removeTrackFromPlaylist:", error.message);
	return !error;
}
