import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
	AuthScopeChangedError,
	queryKeys,
	useAuthMutation,
	usePrivateQuery,
	useQueryScope,
} from "@/lib/query";
import {
	getPlaylists,
	createPlaylist,
	deletePlaylist,
	renamePlaylist,
	getPlaylistTracks,
	addTrackToPlaylist,
	removeTrackFromPlaylist,
} from "@/lib/supabase/playlists";
import {
	getPinnedPlaylistIds,
	pinPlaylist,
	unpinPlaylist,
} from "@/lib/supabase/publicProfile";

export function useProfilePlaylists(userId: string | undefined) {
	const client = useQueryClient();
	const auth = useQueryScope();
	const playlistsQuery = usePrivateQuery(userId, "playlists", () =>
		getPlaylists(userId!),
	);
	const pinsQuery = usePrivateQuery(userId, "pins", () =>
		getPinnedPlaylistIds(userId!),
	);
	const contentsKey = auth.key(queryKeys.private(userId, "playlist-contents"));
	const contentsQuery = usePrivateQuery(
		userId,
		"playlist-contents",
		async () =>
			client.getQueryData<Record<string, Set<string>>>(contentsKey) ?? {},
	);
	const playlistContents = contentsQuery.data ?? {};
	const pinnedIds = pinsQuery.data ?? new Set<string>();
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState("");
	useEffect(() => {
		setCreating(false);
		setNewName("");
	}, [userId, auth.scope.generation]);
	const mutation = useAuthMutation({
		scope: { id: `playlists:${userId}` },
		mutationFn: (operation: () => Promise<unknown>) => {
			if (!userId || userId !== auth.scope.viewer)
				throw new AuthScopeChangedError();
			return operation();
		},
		onSettled: async () => {
			await Promise.all([
				client.invalidateQueries({
					queryKey: queryKeys.private(userId, "playlists"),
				}),
				client.invalidateQueries({
					queryKey: queryKeys.private(userId, "pins"),
				}),
				client.invalidateQueries({ queryKey: ["public", userId] }),
				client.invalidateQueries({
					queryKey: ["private", userId, "playlist-tracks"],
				}),
				client.invalidateQueries({
					queryKey: ["private", userId],
					predicate: (query) =>
						String(query.queryKey[2]).startsWith("playlist:"),
				}),
			]);
		},
	});
	const handleContentsLoaded = (playlistId: string, trackIds: string[]) => {
		if (!auth.isCurrent()) return;
		client.setQueryData<Record<string, Set<string>>>(
			contentsKey,
			(previous) => ({ ...previous, [playlistId]: new Set(trackIds) }),
		);
	};
	const handleEnsurePlaylistLoaded = async (playlistId: string) => {
		if (!auth.isCurrent()) return;
		const tracks = await client.fetchQuery({
			queryKey: auth.key(["private", userId, "playlist-tracks", playlistId]),
			queryFn: async () => {
				if (!auth.isCurrent()) throw new AuthScopeChangedError();
				const tracks = await getPlaylistTracks(playlistId);
				if (!auth.isCurrent()) throw new AuthScopeChangedError();
				return tracks;
			},
		});
		handleContentsLoaded(
			playlistId,
			tracks.map((track) => track.track_id),
		);
	};
	const handleTrackRemoved = (playlistId: string, trackId: string) => {
		if (!auth.isCurrent()) return;
		client.setQueryData<Record<string, Set<string>>>(
			contentsKey,
			(previous) => {
				const ids = new Set(previous?.[playlistId]);
				ids.delete(trackId);
				return { ...previous, [playlistId]: ids };
			},
		);
	};
	const handleCreatePlaylist = async () => {
		if (!userId || !newName.trim()) return;
		await mutation.mutateAsync(() => createPlaylist(userId, newName.trim()));
		if (!auth.isCurrent()) return;
		setNewName("");
		setCreating(false);
	};
	const handleDeletePlaylist = (id: string) =>
		mutation.mutateAsync(() => deletePlaylist(id));
	const handleRenamePlaylist = (id: string, name: string) =>
		mutation.mutateAsync(() => renamePlaylist(id, name));
	const handleAddToPlaylist = async (trackId: string, playlistId: string) => {
		await mutation.mutateAsync(() =>
			addTrackToPlaylist(playlistId, trackId, 0),
		);
		await handleEnsurePlaylistLoaded(playlistId);
	};
	const handleRemoveFromPlaylist = async (
		trackId: string,
		playlistId: string,
	) => {
		await mutation.mutateAsync(() =>
			removeTrackFromPlaylist(playlistId, trackId),
		);
		handleTrackRemoved(playlistId, trackId);
	};
	const handleTogglePin = async (playlistId: string) => {
		if (!userId) return;
		await mutation.mutateAsync(async () => {
			const key = pinsQuery.queryKey;
			await client.cancelQueries({ queryKey: key });
			if (!auth.isCurrent()) throw new AuthScopeChangedError();
			const previous =
				client.getQueryData<Set<string>>(key) ?? new Set<string>();
			const next = new Set(previous);
			if (previous.has(playlistId)) next.delete(playlistId);
			else next.add(playlistId);
			client.setQueryData(key, next);
			try {
				if (previous.has(playlistId)) await unpinPlaylist(userId, playlistId);
				else await pinPlaylist(userId, playlistId, previous.size);
			} catch (error) {
				if (auth.isCurrent()) client.setQueryData(key, previous);
				throw error;
			}
		});
	};
	return {
		playlists: playlistsQuery.data ?? [],
		playlistsLoading: Boolean(userId) && playlistsQuery.isPending,
		playlistsError: playlistsQuery.error ?? pinsQuery.error ?? mutation.error,
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
