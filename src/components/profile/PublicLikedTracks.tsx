"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import {
	getPublicLikedTracks,
	type PublicLikedTrack,
} from "@/lib/supabase/publicProfile";
import {
	ensureTracksLoaded,
	findTrackById,
	subscribeStore,
	getStoreSnapshot,
} from "@/lib/track/trackStore";
import { decodeTrackKey } from "@/lib/track/trackKey";
import { resolveTrackMeta } from "@/lib/profile/profileHelpers";
import TrackRow from "@/components/common/TrackRow";
import Card from "@/components/ui/Card";
import styles from "./profile.module.scss";

export default function PublicLikedTracks({ userId }: { userId: string }) {
	const [tracks, setTracks] = useState<PublicLikedTrack[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [reload, setReload] = useState(0);
	useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreSnapshot);
	useEffect(() => {
		void ensureTracksLoaded();
	}, []);
	useEffect(() => {
		let active = true;
		setLoading(true);
		setError(false);
		setTracks([]);
		getPublicLikedTracks(userId)
			.then((result) => {
				if (active) setTracks(result);
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
	}, [userId, reload]);
	const metadata = new Map(tracks.map((track) => [track.track_id, track]));
	return (
		<Card
			as="section"
			variant="modal"
			heading={
				<span className={styles.privacyLabel}>
					<Heart size={18} aria-hidden="true" />
					<span>Liked Tracks</span>
				</span>
			}
			className={styles.profileContentCard}
			aria-busy={loading}
			headerActions={
				!loading &&
				!error &&
				tracks.length > 0 && (
					<span className={styles.sectionCount}>{tracks.length}</span>
				)
			}
		>
			{loading ? (
				<div className={styles.loadingSmall}>Loading…</div>
			) : error ? (
				<div role="alert">
					<p className={styles.statusError}>Could not load liked tracks.</p>
					<button type="button" onClick={() => setReload((value) => value + 1)}>
						Retry
					</button>
				</div>
			) : tracks.length === 0 ? (
				<div className={styles.empty}>No public liked tracks</div>
			) : (
				<div className={styles.playlistTracks}>
					{tracks.map((track, index) => {
						const id = track.track_id;
						const meta = resolveTrackMeta(id, metadata);
						const title = meta?.title ?? `Track #${id}`;
						const artist = meta?.artist;
						const cover = meta?.cover;
						const decoded =
							!id.startsWith("http") && !id.endsWith("-e")
								? decodeTrackKey(id)
								: null;
						return (
							<TrackRow
								key={id}
								trackId={id}
								index={index}
								title={title}
								artist={artist}
								cover={cover}
								dbMeta={{
									title,
									artist,
									cover,
									mp3_url:
										track.mp3_url ?? decoded?.url ?? findTrackById(id)?.url,
								}}
								showLike
							/>
						);
					})}
				</div>
			)}
		</Card>
	);
}
