"use client";

import { useState } from "react";
import TrackLink from "./TrackLink";
import {
	Loader as LoaderIcon,
	Pause as PauseIcon,
	Play as PlayIcon,
	X as XIcon,
	Music as MusicIcon,
} from "lucide-react";
import { usePlayer } from "@/lib/miniplayer/context";
import { encodeTrackKey, decodeTrackKey } from "@/lib/track/trackKey";
import type { Playlist } from "@/lib/supabase/playlists";
import type { TrackLikeMeta } from "@/lib/supabase/likesContext";
import { cx } from "@/lib/cx";
import IconButton from "@/components/ui/IconButton";
import AddToPlaylistMenu from "./AddToPlaylistMenu";
import LikeButton from "./LikeButton";
import styles from "./TrackRow.module.scss";

function buildHref(trackId: string, dbMeta?: TrackLikeMeta): string {
	if (trackId.endsWith("-e")) return `/track?key=${trackId}`;

	const mp3_url = dbMeta?.mp3_url;
	if (mp3_url) {
		return `/track?key=${encodeTrackKey({
			url: mp3_url,
			title: dbMeta?.title,
			artist: dbMeta?.artist,
			cover: dbMeta?.cover,
		})}`;
	}
	if (!trackId.startsWith("http")) {
		const decoded = decodeTrackKey(trackId);
		if (decoded?.url) return `/track?key=${trackId}`;
	}
	return `/track?id=${trackId}`;
}

function PlayBtn({
	trackId,
	title,
	artist,
	cover,
	dbMeta,
}: {
	trackId: string;
	title?: string;
	artist?: string;
	cover?: string;
	dbMeta?: TrackLikeMeta;
}) {
	const player = usePlayer();
	const [loading, setLoading] = useState(false);
	if (!player) return null;

	const { nowPlaying, isPlaying, play, pause, resume } = player;
	const isThis = nowPlaying?.id === trackId || nowPlaying?.url === trackId;
	const active = isThis && isPlaying;

	const handleClick = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (isThis) {
			isPlaying ? pause() : resume();
			return;
		}
		const decoded = !trackId.startsWith("http")
			? decodeTrackKey(trackId)
			: null;
		const playUrl = dbMeta?.mp3_url ?? decoded?.url;
		if (playUrl) {
			play({
				id: trackId,
				url: playUrl,
				title: dbMeta?.title ?? title ?? decoded?.title ?? "Unknown",
				artist: dbMeta?.artist ?? artist ?? decoded?.artist ?? "",
				cover: dbMeta?.cover ?? cover ?? decoded?.cover,
			});
			return;
		}
		setLoading(true);
		const { ensureTracksLoaded, findTrackById } =
			await import("@/lib/track/trackStore");
		await ensureTracksLoaded();
		const track = findTrackById(trackId);
		if (track)
			play({
				id: track.id,
				url: track.url,
				title: track.title,
				artist: track.artist,
				cover: track.cover,
				yandexUrl: track.yandexUrl,
			});
		setLoading(false);
	};

	return (
		<IconButton
			label={active ? "Pause" : "Play"}
			variant="surface"
			active={isThis}
			className={styles.playBtn}
			onClick={handleClick}
		>
			{loading ? (
				<LoaderIcon size={13} />
			) : active ? (
				<PauseIcon size={13} />
			) : (
				<PlayIcon size={13} />
			)}
		</IconButton>
	);
}

export interface TrackRowProps {
	trackId: string;
	index: number;
	title: string;
	artist?: string;
	cover?: string;
	dbMeta?: TrackLikeMeta;
	playlists?: Playlist[];
	showLike?: boolean;
	onRemove?: (e: React.MouseEvent) => void;
}

export default function TrackRow({
	trackId,
	index,
	title,
	artist,
	cover,
	dbMeta,
	playlists,
	showLike,
	onRemove,
}: TrackRowProps) {
	const player = usePlayer();
	const isThis =
		player?.nowPlaying?.id === trackId || player?.nowPlaying?.url === trackId;
	const href = buildHref(trackId, dbMeta);

	return (
		<TrackLink
			href={href}
			className={cx(styles.row, isThis && styles.rowActive)}
		>
			<span className={styles.num}>{index + 1}</span>
			<div className={styles.cover}>
				{cover ? (
					<img src={cover} alt="" className={styles.coverImg} loading="lazy" />
				) : (
					<div className={styles.coverPlaceholder}>
						<MusicIcon size={14} color="var(--muted)" />
					</div>
				)}
			</div>
			<div className={styles.info}>
				<span className={styles.title}>{title}</span>
				{artist && <span className={styles.artist}>{artist}</span>}
			</div>
			<div
				className={styles.actions}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
			>
				{playlists && (
					<AddToPlaylistMenu trackId={trackId} playlists={playlists} />
				)}
				{showLike && (
					<LikeButton
						compact
						target={{
							type: "track",
							trackId,
							meta: {
								title,
								artist,
								cover,
								mp3_url: dbMeta?.mp3_url,
							},
						}}
					/>
				)}
				{onRemove && (
					<IconButton
						label="Remove"
						variant="danger"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onRemove(e);
						}}
					>
						<XIcon size={12} />
					</IconButton>
				)}
				<PlayBtn
					trackId={trackId}
					title={title}
					artist={artist}
					cover={cover}
					dbMeta={dbMeta}
				/>
			</div>
		</TrackLink>
	);
}
