import { useState, useEffect, useCallback } from "react";
import {
	getPlaylists,
	createPlaylist,
	deletePlaylist,
	renamePlaylist,
	getPlaylistTracks,
	addTrackToPlaylist,
	removeTrackFromPlaylist,
	type Playlist,
} from "@/lib/supabase/playlists";
import {
	getPinnedPlaylistIds,
	pinPlaylist,
	unpinPlaylist,
} from "@/lib/supabase/publicProfile";

export function useProfilePlaylists(userId: string | undefined) {
	const [playlists, setPlaylists] = useState<Playlist[]>([]);
	const [playlistsLoading, setPlaylistsLoading] = useState(false);
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const [playlistContents, setPlaylistContents] = useState<
		Record<string, Set<string>>
	>({});
	const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (!userId) return;
		setPlaylistsLoading(true);
		getPlaylists(userId).then((data) => {
			setPlaylists(data);
			setPlaylistsLoading(false);
		});
		getPinnedPlaylistIds(userId).then(setPinnedIds);
	}, [userId]);

	const handleEnsurePlaylistLoaded = useCallback(
		async (playlistId: string) => {
			if (playlistContents[playlistId]) return;
			const tracks = await getPlaylistTracks(playlistId);
			setPlaylistContents((prev) => ({
				...prev,
				[playlistId]: new Set(tracks.map((t) => t.track_id)),
			}));
		},
		[playlistContents],
	);

	const handleContentsLoaded = useCallback(
		(playlistId: string, trackIds: string[]) => {
			setPlaylistContents((prev) => ({
				...prev,
				[playlistId]: new Set(trackIds),
			}));
		},
		[],
	);

	const handleTrackRemoved = useCallback(
		(playlistId: string, trackId: string) => {
			setPlaylistContents((prev) => {
				const set = new Set(prev[playlistId]);
				set.delete(trackId);
				return { ...prev, [playlistId]: set };
			});
		},
		[],
	);

	const handleCreatePlaylist = async () => {
		if (!userId) return;
		const name = newName.trim();
		if (!name) return;
		const pl = await createPlaylist(userId, name);
		if (pl) {
			setPlaylists((prev) => [pl, ...prev]);
			setPlaylistContents((prev) => ({ ...prev, [pl.id]: new Set() }));
		}
		setNewName("");
		setCreating(false);
	};

	const handleDeletePlaylist = async (id: string) => {
		await deletePlaylist(id);
		setPlaylists((prev) => prev.filter((p) => p.id !== id));
		setPlaylistContents((prev) => {
			const n = { ...prev };
			delete n[id];
			return n;
		});
	};

	const handleRenamePlaylist = async (id: string, name: string) => {
		await renamePlaylist(id, name);
		setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
	};

	const handleAddToPlaylist = async (trackId: string, playlistId: string) => {
		await addTrackToPlaylist(playlistId, trackId, 0);
		setPlaylistContents((prev) => {
			const set = new Set(prev[playlistId] ?? []);
			set.add(trackId);
			return { ...prev, [playlistId]: set };
		});
	};

	const handleRemoveFromPlaylist = async (
		trackId: string,
		playlistId: string,
	) => {
		await removeTrackFromPlaylist(playlistId, trackId);
		setPlaylistContents((prev) => {
			const set = new Set(prev[playlistId] ?? []);
			set.delete(trackId);
			return { ...prev, [playlistId]: set };
		});
	};

	const handleTogglePin = async (playlistId: string) => {
		if (!userId) return;
		if (pinnedIds.has(playlistId)) {
			setPinnedIds((prev) => {
				const s = new Set(prev);
				s.delete(playlistId);
				return s;
			});
			await unpinPlaylist(userId, playlistId);
		} else {
			setPinnedIds((prev) => new Set(prev).add(playlistId));
			await pinPlaylist(userId, playlistId, pinnedIds.size);
		}
	};

	return {
		playlists,
		playlistsLoading,
		creating,
		setCreating,
		newName,
		setNewName,
		playlistContents,
		pinnedIds,
		handleEnsurePlaylistLoaded,
		handleContentsLoaded,
		handleTrackRemoved,
		handleCreatePlaylist,
		handleDeletePlaylist,
		handleRenamePlaylist,
		handleAddToPlaylist,
		handleRemoveFromPlaylist,
		handleTogglePin,
	};
}
