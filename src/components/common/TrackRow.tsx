"use client";

import Image from "next/image";

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
			if (isPlaying) pause();
			else resume();
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
			className={cx(
				"[&:hover:not(:disabled)]:[background:var(--surface2)] [&:hover:not(:disabled)]:text-accent [&:hover:not(:disabled)]:border-accent",
				isThis ? "text-accent border-accent" : "text-muted",
			)}
			onClick={handleClick}
		>
			{loading ? (
				<LoaderIcon size={14} />
			) : active ? (
				<PauseIcon size={14} />
			) : (
				<PlayIcon size={14} />
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
			className={cx(
				"flex items-center gap-3 p-[9px_12px] rounded-2xl [border:1px_solid_transparent] text-inherit no-underline [transition:background_var(--dur-base)_var(--ease-out),border-color_var(--dur-base)_var(--ease-out)] hover:[background:var(--surface)] hover:border-border [&:hover_.actions]:opacity-100",
				isThis && "[background:var(--accent-bg-hover)]",
			)}
		>
			<span
				className={"text-[12px] font-bold text-muted w-4.5 text-right shrink-0"}
			>
				{index + 1}
			</span>
			<div className="relative w-10 h-10 shrink-0">
				{cover ? (
					<Image
						src={cover}
						alt=""
						width={40}
						height={40}
						className={
							"w-10 h-10 rounded-xs object-cover block [border:1px_solid_var(--border)]"
						}
						loading="lazy"
					/>
				) : (
					<div
						className={
							"w-10 h-10 rounded-xs [background:var(--surface2)] [border:1px_solid_var(--border)] flex items-center justify-center"
						}
					>
						<MusicIcon size={14} color="var(--muted)" />
					</div>
				)}
			</div>
			<div className={"flex-1 min-w-0 flex flex-col gap-0.5"}>
				<span
					className={
						"text-[14px] font-extrabold text-foreground whitespace-nowrap overflow-hidden text-ellipsis"
					}
				>
					{title}
				</span>
				{artist && (
					<span
						className={
							"text-[12px] font-bold text-muted whitespace-nowrap overflow-hidden text-ellipsis"
						}
					>
						{artist}
					</span>
				)}
			</div>
			<div
				className={
					"flex items-center gap-1.5 shrink-0 opacity-100 [transition:opacity_0.15s]"
				}
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
