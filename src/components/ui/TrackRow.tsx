"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
	Loader as LoaderIcon,
	Pause as PauseIcon,
	Play as PlayIcon,
	Plus as PlusIcon,
	Check as CheckIcon,
	X as XIcon,
	Music as MusicIcon,
} from "lucide-react";
import { usePlayer } from "@/lib/miniplayer/context";
import { useAuth } from "@/lib/auth";
import { encodeTrackKey, decodeTrackKey } from "@/lib/trackKey";
import {
	getPlaylistTracks,
	addTrackToPlaylist,
	removeTrackFromPlaylist,
	type Playlist,
} from "@/lib/playlists";
import type { TrackLikeMeta } from "@/lib/likesContext";
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
			await import("@/lib/trackStore");
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
		<button
			className={`${styles.playBtn} ${isThis ? styles.playBtnActive : ""}`}
			onClick={handleClick}
			aria-label={active ? "Pause" : "Play"}
		>
			{loading ? (
				<LoaderIcon size={13} />
			) : active ? (
				<PauseIcon size={13} />
			) : (
				<PlayIcon size={13} />
			)}
		</button>
	);
}

function AddToPlaylistMenu({
	trackId,
	playlists,
}: {
	trackId: string;
	playlists: Playlist[];
}) {
	const { user, isBanned } = useAuth();
	const [open, setOpen] = useState(false);
	const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
	const [inPlaylists, setInPlaylists] = useState<Set<string>>(new Set());
	const btnRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (
				!btnRef.current?.contains(e.target as Node) &&
				!menuRef.current?.contains(e.target as Node)
			)
				setOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	if (!user || isBanned || playlists.length === 0) return null;

	const handleOpen = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (isBanned) return;
		if (open) {
			setOpen(false);
			return;
		}
		if (btnRef.current) {
			const rect = btnRef.current.getBoundingClientRect();
			setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
		}
		const results = await Promise.all(
			playlists.map((pl) => getPlaylistTracks(pl.id)),
		);
		const containing = new Set<string>();
		playlists.forEach((pl, i) => {
			if (results[i].some((t) => t.track_id === trackId)) containing.add(pl.id);
		});
		setInPlaylists(containing);
		setOpen(true);
	};

	const handleToggle = async (e: React.MouseEvent, playlistId: string) => {
		e.preventDefault();
		e.stopPropagation();
		const isIn = inPlaylists.has(playlistId);
		if (isIn) {
			await removeTrackFromPlaylist(playlistId, trackId);
			setInPlaylists((prev) => {
				const s = new Set(prev);
				s.delete(playlistId);
				return s;
			});
		} else {
			await addTrackToPlaylist(playlistId, trackId, 0);
			setInPlaylists((prev) => new Set(prev).add(playlistId));
		}
	};

	return (
		<>
			<button
				ref={btnRef}
				className={styles.actionBtn}
				onClick={handleOpen}
				disabled={isBanned}
				aria-label="Add to playlist"
				title={isBanned ? "Your account is banned" : "Add to playlist"}
				style={isBanned ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
			>
				<PlusIcon size={13} />
			</button>
			{open &&
				pos &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						ref={menuRef}
						className={styles.menu}
						style={{ top: pos.top, right: pos.right }}
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
						}}
					>
						{playlists.map((pl) => {
							const isIn = inPlaylists.has(pl.id);
							return (
								<button
									key={pl.id}
									className={`${styles.menuItem} ${isIn ? styles.menuItemActive : ""}`}
									onClick={(e) => handleToggle(e, pl.id)}
								>
									<span>{pl.name}</span>
									{isIn && <CheckIcon size={12} />}
								</button>
							);
						})}
					</div>,
					document.body,
				)}
		</>
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
		<Link
			href={href}
			className={`${styles.row} ${isThis ? styles.rowActive : ""}`}
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
					<button
						className={`${styles.actionBtn} ${styles.actionBtnRemove}`}
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onRemove(e);
						}}
						aria-label="Remove"
					>
						<XIcon size={12} />
					</button>
				)}
				<PlayBtn
					trackId={trackId}
					title={title}
					artist={artist}
					cover={cover}
					dbMeta={dbMeta}
				/>
			</div>
		</Link>
	);
}
