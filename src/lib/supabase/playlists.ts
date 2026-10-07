import { getSupabase } from ".";
import { collectPages } from "./pagination";

export interface Playlist {
	id: string;
	name: string;
	created_at: string;
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
	const tracks = await getPlaylistTracks(playlistId);
	return {
		playlist: playlist as Playlist,
		tracks,
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
	if (!sb) throw new Error("Playlist service is unavailable");
	return collectPages((offset, limit) =>
		sb
			.from("playlists")
			.select("id, name, created_at")
			.eq("user_id", userId)
			.order("created_at", { ascending: false })
			.order("id", { ascending: false })
			.range(offset, offset + limit - 1),
	);
}

export async function createPlaylist(
	userId: string,
	name: string,
): Promise<Playlist | null> {
	const sb = getSupabase();
	if (!sb) throw new Error("Playlist service is unavailable");
	const { data, error } = await sb
		.from("playlists")
		.insert({ user_id: userId, name })
		.select("id, name, created_at")
		.single();
	if (error) throw error;
	if (!data) throw new Error("Playlist was not created");
	return data;
}

export async function deletePlaylist(playlistId: string): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) throw new Error("Playlist service is unavailable");
	const { data, error } = await sb
		.from("playlists")
		.delete()
		.eq("id", playlistId)
		.select("id")
		.single();
	if (error) throw error;
	if (!data) throw new Error("Playlist was not deleted");
	return true;
}

export async function renamePlaylist(
	playlistId: string,
	name: string,
): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) throw new Error("Playlist service is unavailable");
	const { data, error } = await sb
		.from("playlists")
		.update({ name: name.trim() })
		.eq("id", playlistId)
		.select("id")
		.single();
	if (error) throw error;
	if (!data) throw new Error("Playlist was not renamed");
	return true;
}

export async function getPlaylistTracks(
	playlistId: string,
): Promise<PlaylistTrack[]> {
	const sb = getSupabase();
	if (!sb) throw new Error("Playlist service is unavailable");
	return collectPages((offset, limit) =>
		sb
			.from("playlist_tracks")
			.select("id, playlist_id, track_id, position")
			.eq("playlist_id", playlistId)
			.order("position")
			.order("id")
			.range(offset, offset + limit - 1),
	);
}

export async function addTrackToPlaylist(
	playlistId: string,
	trackId: string,
	position: number,
): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) throw new Error("Playlist service is unavailable");
	const { error } = await sb
		.from("playlist_tracks")
		.upsert(
			{ playlist_id: playlistId, track_id: trackId, position },
			{ onConflict: "playlist_id,track_id", ignoreDuplicates: true },
		);
	if (error) throw error;
	return true;
}

export async function removeTrackFromPlaylist(
	playlistId: string,
	trackId: string,
): Promise<boolean> {
	await removePlaylistDetailTrack(playlistId, trackId);
	return true;
}
