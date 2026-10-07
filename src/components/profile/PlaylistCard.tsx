"use client";

import Image from "next/image";
import { navigateProfile } from "@/lib/profile/navigation";
import {
	useEffect,
	useState,
	useSyncExternalStore,
	type ReactNode,
} from "react";
import {
	getPlaylistTracks,
	type Playlist,
	type PlaylistTrack,
} from "@/lib/supabase/playlists";
import { useLikes } from "@/lib/supabase/likesContext";
import {
	ensureTracksLoaded,
	getStoreSnapshot,
	subscribeStore,
} from "@/lib/track/trackStore";
import { resolveTrackMeta } from "@/lib/profile/profileHelpers";
import styles from "./profile.module.scss";

export default function PlaylistCard({
	playlist,
	userId,
	children,
	variant = "compact",
}: {
	playlist: Playlist;
	userId: string;
	children?: ReactNode;
	variant?: "compact" | "grid";
}) {
	const { likedMeta } = useLikes();
	useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreSnapshot);
	const [tracks, setTracks] = useState<PlaylistTrack[] | null>(null);
	const [failedCover, setFailedCover] = useState<string | null>(null);
	const [error, setError] = useState(false);
	useEffect(() => {
		let active = true;
		setTracks(null);
		setError(false);
		getPlaylistTracks(playlist.id)
			.then((data) => {
				if (active) setTracks(data);
			})
			.catch(() => {
				if (active) setError(true);
			});
		ensureTracksLoaded();
		return () => {
			active = false;
		};
	}, [playlist.id]);
	const firstTrack = tracks?.[0]?.track_id;
	const cover = firstTrack
		? resolveTrackMeta(firstTrack, likedMeta)?.cover
		: undefined;
	const count = tracks
		? `${tracks.length} ${tracks.length === 1 ? "song" : "songs"}`
		: error
			? "Unavailable"
			: "Loading…";
	return (
		<div
			className={`${styles.playlistItem} ${variant === "grid" ? styles.playlistGridCard : styles.playlistCompactCard}`}
		>
			<div className={styles.playlistHeader}>
				<a
					href={`/profile/${encodeURIComponent(userId)}/${encodeURIComponent(playlist.id)}`}
					onClick={(event) => {
						if (
							event.defaultPrevented ||
							event.button !== 0 ||
							event.metaKey ||
							event.ctrlKey ||
							event.shiftKey ||
							event.altKey
						)
							return;
						event.preventDefault();
						navigateProfile(event.currentTarget.getAttribute("href")!);
					}}
					className={styles.playlistCardLink}
				>
					<span className={styles.playlistCover}>
						{cover && cover !== failedCover ? (
							<Image
								src={cover}
								alt=""
								width={variant === "grid" ? 300 : 44}
								height={variant === "grid" ? 300 : 44}
								onError={() => setFailedCover(cover)}
							/>
						) : (
							<svg
								aria-hidden="true"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M9 18V5l12-2v13" />
								<circle cx="6" cy="18" r="3" />
								<circle cx="18" cy="16" r="3" />
							</svg>
						)}
					</span>
					<span className={styles.playlistCardInfo}>
						<span className={styles.playlistName}>{playlist.name}</span>
						<span className={styles.playlistCount}>Playlist · {count}</span>
					</span>
				</a>

				{children}
			</div>
		</div>
	);
}
