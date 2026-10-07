"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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
	const [detail, setDetail] = useState<Detail>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [removeError, setRemoveError] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [reload, setReload] = useState(0);

	useEffect(() => {
		if (authLoading) return;
		let active = true;
		setLoading(true);
		setError(false);
		setDetail(null);
		getPlaylistDetail(userId, playlistId)
			.then((result) => {
				if (active) setDetail(result);
			})
			.catch(() => {
				if (active) setError(true);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [userId, playlistId, reload, authLoading, user?.id]);

	const removeTrack = async (trackId: string) => {
		if (removing || authLoading || isBanned || user?.id !== userId) return;
		setRemoving(true);
		setRemoveError(false);
		try {
			await removePlaylistDetailTrack(playlistId, trackId);
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
			heading={detail?.playlist.name ?? "Playlist"}
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
					<button type="button" onClick={() => setReload((value) => value + 1)}>
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
