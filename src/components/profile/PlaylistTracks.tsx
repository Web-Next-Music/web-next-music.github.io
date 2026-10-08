"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListMusic } from "lucide-react";
import { useLikes } from "@/lib/supabase/likesContext";
import { useAuth } from "@/lib/auth";
import {
	getPlaylistDetail,
	removePlaylistDetailTrack,
} from "@/lib/supabase/playlists";
import { decodeTrackKey } from "@/lib/track/trackKey";
import {
	findTrackById,
	ensureTracksLoaded,
	subscribeStore,
	getStoreSnapshot,
} from "@/lib/track/trackStore";
import { resolveTrackMeta } from "@/lib/profile/profileHelpers";
import TrackRow from "@/components/common/TrackRow";
import Card from "@/components/ui/Card";
import styles from "./profile.module.scss";

import PlaylistActions, {
	type PlaylistManagementProps,
} from "./PlaylistActions";

type Detail = Awaited<ReturnType<typeof getPlaylistDetail>>;

export default function PlaylistTracks({
	userId,
	playlistId,
	management,
}: {
	userId: string;
	playlistId: string;
	management?: PlaylistManagementProps;
}) {
	const { user, loading: authLoading, isBanned } = useAuth();
	const { likedMeta } = useLikes();
	useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreSnapshot);
	useEffect(() => {
		ensureTracksLoaded();
	}, []);
	const client = useQueryClient();
	const queryKey = [
		user?.id === userId ? "private" : "public",
		userId,
		`playlist:${playlistId}`,
	];
	const query = useQuery({
		queryKey,
		queryFn: () => getPlaylistDetail(userId, playlistId),
		enabled: !authLoading,
	});
	const detail = query.data ?? null;
	const loading = query.isPending;
	const error = query.isError;
	const setDetail = (update: (current: Detail) => Detail) =>
		client.setQueryData<Detail>(queryKey, (current) => update(current ?? null));
	const [removeError, setRemoveError] = useState(false);
	const [removing, setRemoving] = useState(false);
	const removeTrack = async (trackId: string) => {
		if (removing || authLoading || isBanned || user?.id !== userId) return;
		setRemoving(true);
		setRemoveError(false);
		try {
			await client.cancelQueries({ queryKey });
			await removePlaylistDetailTrack(playlistId, trackId);
			void client.invalidateQueries({
				queryKey: ["private", userId, "playlist-tracks", playlistId],
			});
			void client.invalidateQueries({
				queryKey: ["private", userId, "playlist-contents"],
			});
			setDetail((current) =>
				current
					? {
							...current,
							tracks: current.tracks.filter(
								(track) => track.track_id !== trackId,
							),
						}
					: current,
			);
		} catch {
			setRemoveError(true);
		} finally {
			setRemoving(false);
		}
	};

	return (
		<Card
			as="section"
			variant="modal"
			heading={
				<span className={styles.privacyLabel}>
					<ListMusic size={18} aria-hidden="true" />
					<span>{detail?.playlist.name ?? "Playlist"}</span>
				</span>
			}
			className={styles.profileContentCard}
			aria-busy={loading || authLoading || removing}
			headerActions={
				detail && (
					<div className={styles.playlistDetailHeaderActions}>
						{management && !authLoading && !isBanned && user?.id === userId && (
							<PlaylistActions
								key={playlistId}
								playlist={detail.playlist}
								{...management}
								variant="header"
								onRename={async (id, name) => {
									await management.onRename(id, name);
									setDetail((current) =>
										current
											? { ...current, playlist: { ...current.playlist, name } }
											: current,
									);
								}}
							/>
						)}
						<span className={styles.sectionCount}>{detail.tracks.length}</span>
					</div>
				)
			}
		>
			{loading || authLoading ? (
				<div className={styles.loadingSmall}>Loading…</div>
			) : error ? (
				<div role="alert">
					<p className={styles.statusError}>Could not load this playlist.</p>
					<button type="button" onClick={() => void query.refetch()}>
						Retry
					</button>
				</div>
			) : !detail ? (
				<div className={styles.empty}>Playlist not found or unavailable</div>
			) : (
				<div className={styles.playlistTracks}>
					{removeError && (
						<p className={styles.statusError} role="alert">
							Could not remove the track. Please try again.
						</p>
					)}
					{detail.tracks.length === 0 ? (
						<div className={styles.emptySmall}>No tracks</div>
					) : (
						detail.tracks.map((track, index) => {
							const meta = resolveTrackMeta(track.track_id, likedMeta);
							const title = meta?.title ?? track.track_id;
							const artist = meta?.artist ?? "";
							const cover = meta?.cover;
							const mp3_url =
								(!track.track_id.startsWith("http") &&
								!track.track_id.endsWith("-e")
									? decodeTrackKey(track.track_id)?.url
									: undefined) ?? findTrackById(track.track_id)?.url;
							return (
								<TrackRow
									key={track.id}
									trackId={track.track_id}
									index={index}
									title={title}
									artist={artist}
									cover={cover}
									dbMeta={{
										...likedMeta.get(track.track_id),
										title,
										artist,
										cover,
										mp3_url: mp3_url ?? likedMeta.get(track.track_id)?.mp3_url,
									}}
									showLike
									onRemove={
										user?.id === userId && !isBanned && !removing
											? (event) => {
													event.preventDefault();
													event.stopPropagation();
													void removeTrack(track.track_id);
												}
											: undefined
									}
								/>
							);
						})
					)}
				</div>
			)}
		</Card>
	);
}
