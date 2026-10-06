"use client";

import Image from "next/image";

import styles from "./FckCensorTabs.module.scss";

import {
	useState,
	useEffect,
	useRef,
	useMemo,
	useSyncExternalStore,
} from "react";
import { TRACK_META, type TrackMeta } from "@/lib/fckcensor";
import {
	ensureTracksLoaded,
	subscribeStore,
	getStoreSnapshot,
	getServerSnapshot,
} from "@/lib/track/trackStore";
import { Plus, Check, Pause, Play, Music } from "lucide-react";
import { usePlayer } from "@/lib/miniplayer";
import LikeButton from "@/components/common/LikeButton";
import Menu from "@/components/ui/Menu";
import menuStyles from "@/components/ui/Menu.module.scss";
import SearchInput from "@/components/ui/SearchInput";
import { cx } from "@/lib/cx";
import { useAuth } from "@/lib/auth";
import {
	getPlaylists,
	getPlaylistTracks,
	addTrackToPlaylist,
	removeTrackFromPlaylist,
	type Playlist,
} from "@/lib/supabase/playlists";
import TrackLink from "@/components/common/TrackLink";
import type { PlayBtnProps, SearchBarProps, LegacyListProps } from "@/types/ui";

export type { NowPlaying } from "@/types/player";

function AddToPlaylistBtn({
	trackId,
	playlists,
}: {
	trackId: string;
	playlists: Playlist[];
}) {
	const { user, isBanned } = useAuth();
	const [open, setOpen] = useState(false);
	const [inPlaylists, setInPlaylists] = useState<Set<string>>(new Set());
	const btnRef = useRef<HTMLButtonElement>(null);

	if (!user || isBanned) return null;

	const handleOpen = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (open) {
			setOpen(false);
			return;
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
				className={
					"flex items-center justify-center w-7.5 h-7.5 rounded-sm [border:1px_solid_transparent] bg-none text-muted cursor-pointer shrink-0 opacity-100 [transition:opacity_0.15s,background_0.15s,color_0.15s,border-color_0.15s] hover:[background:var(--surface2)] hover:text-foreground hover:border-border"
				}
				onClick={handleOpen}
				aria-label="Add to playlist"
			>
				<Plus size={17} />
			</button>
			<Menu
				open={open}
				onClose={() => setOpen(false)}
				anchorRef={btnRef}
				align="end"
				offset={4}
			>
				{playlists.length === 0 ? (
					<div className={"p-[8px_12px] text-[12px] text-muted"}>
						No playlists
					</div>
				) : (
					playlists.map((pl) => {
						const inPlaylist = inPlaylists.has(pl.id);
						return (
							<button
								key={pl.id}
								type="button"
								role="menuitem"
								className={cx(menuStyles.item, inPlaylist && menuStyles.active)}
								onClick={(e) => handleToggle(e, pl.id)}
							>
								<span className={menuStyles.itemLabel}>{pl.name}</span>
								{inPlaylist && <Check size={12} />}
							</button>
						);
					})
				)}
			</Menu>
		</>
	);
}

const PAGE_SIZE = 20;
const TRACK_HEIGHT = 58;
const BUFFER_SIZE = 10;

function PlayBtn({ track }: PlayBtnProps) {
	const player = usePlayer();
	if (!player) return null;
	const { nowPlaying, isPlaying, play, pause, resume } = player;
	const isThis = nowPlaying?.url === track.url;
	const active = isThis && isPlaying;

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!isThis) {
			play(track);
		} else if (isPlaying) {
			pause();
		} else {
			resume();
		}
	};

	return (
		<button
			className={`${"flex items-center justify-center w-7.5 h-7.5 rounded-sm [border:1px_solid_var(--border)] [background:var(--surface)] text-muted cursor-pointer shrink-0 opacity-100 [transition:opacity_0.15s,background_0.15s,color_0.15s,border-color_0.15s] hover:[background:var(--surface2)] hover:text-accent hover:border-accent"} ${isThis ? "opacity-100 text-accent border-accent [background:var(--accent-surface)]" : ""}`}
			onClick={handleClick}
			aria-label={active ? "Pause" : "Play"}
		>
			{active ? <Pause size={14} /> : <Play size={14} />}
		</button>
	);
}

function SearchBar({ value, onChange }: SearchBarProps) {
	return (
		<SearchInput
			wrapperClassName={"[margin-bottom:12px]"}
			size="lg"
			iconSize={16}
			radius="pill"
			placeholder="Search by title, artist or ID..."
			value={value}
			onChange={(e) => onChange(e.target.value)}
			onClear={() => onChange("")}
			spellCheck={false}
		/>
	);
}

function LegacyList({ tracks, query, playlists }: LegacyListProps) {
	const enriched = useMemo(
		() =>
			tracks.map((t) => ({
				...t,
				meta: (TRACK_META[t.id] ?? null) as TrackMeta | null,
			})),
		[tracks],
	);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return enriched;
		return enriched.filter(
			(t) =>
				t.id.includes(q) ||
				t.meta?.title?.toLowerCase().includes(q) ||
				t.meta?.artist?.toLowerCase().includes(q),
		);
	}, [enriched, query]);

	const listRef = useRef<HTMLDivElement>(null);
	const spacerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const [renderRange, setRenderRange] = useState({
		start: 0,
		end: PAGE_SIZE + BUFFER_SIZE * 2,
	});

	useEffect(() => {
		setRenderRange({ start: 0, end: PAGE_SIZE + BUFFER_SIZE * 2 });
	}, [filtered]);

	useEffect(() => {
		const handleScroll = () => {
			if (!listRef.current) return;
			const viewportHeight = window.innerHeight;
			const listScrollTop = -listRef.current.getBoundingClientRect().top;

			if (listScrollTop + viewportHeight < 0) {
				setRenderRange({ start: 0, end: Math.min(PAGE_SIZE, filtered.length) });
				return;
			}

			const effectiveScrollTop = Math.max(0, listScrollTop);

			const startIdx = Math.max(
				0,
				Math.floor(effectiveScrollTop / TRACK_HEIGHT) - BUFFER_SIZE,
			);
			const endIdx = Math.min(
				filtered.length,
				Math.ceil((effectiveScrollTop + viewportHeight) / TRACK_HEIGHT) +
					BUFFER_SIZE,
			);

			setRenderRange({ start: startIdx, end: endIdx });
		};

		window.addEventListener("scroll", handleScroll, {
			passive: true,
			capture: true,
		});
		window.addEventListener("resize", handleScroll, { passive: true });
		handleScroll();

		return () => {
			window.removeEventListener("scroll", handleScroll, { capture: true });
			window.removeEventListener("resize", handleScroll);
		};
	}, [filtered.length]);

	const visibleTracks = filtered.slice(renderRange.start, renderRange.end);

	return (
		<div ref={listRef} className={"flex flex-col gap-0.75"}>
			{filtered.length === 0 && (
				<div className={"p-[40px_20px] text-center text-muted text-[14px]"}>
					{query.trim() ? "No results found" : "Failed to load track list"}
				</div>
			)}
			<div
				ref={spacerRef}
				className={"relative"}
				style={{ height: filtered.length * TRACK_HEIGHT }}
			>
				<div
					ref={contentRef}
					className={"absolute top-0 left-0 right-0"}
					style={{
						transform: `translateY(${renderRange.start * TRACK_HEIGHT}px)`,
					}}
				>
					{visibleTracks.map((track, i) => {
						const globalIndex = renderRange.start + i;
						const meta = track.meta;
						const inner = (
							<>
								<span
									className={
										"text-[12px] font-bold font-sans text-muted w-6.25 text-right shrink-0 [@media(max-width:_640px)]:hidden"
									}
								>
									{globalIndex + 1}
								</span>

								{meta?.cover ? (
									<Image
										src={meta.cover}
										alt=""
										width={40}
										height={40}
										className={
											"w-10 h-10 rounded-xs object-cover shrink-0 [border:1px_solid_var(--border)]"
										}
										loading="lazy"
									/>
								) : (
									<div
										className={
											"w-10 h-10 rounded-xs [background:var(--surface2)] [border:1px_solid_var(--border)] flex items-center justify-center shrink-0"
										}
									>
										<Music size={16} color="var(--muted)" />
									</div>
								)}

								<div className={"flex-1 min-w-0"}>
									<div
										className={
											"text-[14px] font-extrabold whitespace-nowrap overflow-hidden text-ellipsis"
										}
									>
										<Highlight
											text={meta?.title ?? `Track #${track.id}`}
											query={query}
										/>
									</div>
									<div
										className={
											"text-[12px] font-bold text-muted mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis"
										}
									>
										{meta?.artist ? (
											<Highlight text={meta.artist} query={query} />
										) : (
											<span className={"opacity-[0.45]"}>ID: {track.id}</span>
										)}
									</div>
								</div>
								<div
									className={"flex items-center gap-1.5 shrink-0"}
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
									}}
								>
									<AddToPlaylistBtn trackId={track.id} playlists={playlists} />
									<LikeButton
										compact
										className={styles.likeBtn}
										target={{ type: "track", trackId: track.id }}
									/>
									<PlayBtn
										track={{
											id: track.id,
											url: track.url,
											title: meta?.title ?? `Track #${track.id}`,
											artist: meta?.artist ?? "",
											cover: meta?.cover,
											yandexUrl: track.yandexUrl,
										}}
									/>
								</div>
							</>
						);

						return meta ? (
							<TrackLink
								key={track.id}
								href={`/track?id=${track.id}`}
								className={
									"flex items-center gap-3.5 p-[9px_14px] rounded-2xl [border:1px_solid_transparent] [transition:all_0.15s] cursor-pointer no-underline text-foreground hover:[background:var(--surface)] hover:border-border [&:hover_.playBtn]:opacity-100 [&:hover_.addToPlaylistBtn]:opacity-100 active:transform-[scale(0.995)] [@media(max-width:_640px)]:gap-2.5 [@media(max-width:_640px)]:p-[8px_10px]"
								}
								style={{ height: TRACK_HEIGHT }}
							>
								{inner}
							</TrackLink>
						) : (
							<a
								key={track.id}
								href={track.yandexUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={
									"flex items-center gap-3.5 p-[9px_14px] rounded-2xl [border:1px_solid_transparent] [transition:all_0.15s] cursor-pointer no-underline text-foreground hover:[background:var(--surface)] hover:border-border [&:hover_.playBtn]:opacity-100 [&:hover_.addToPlaylistBtn]:opacity-100 active:transform-[scale(0.995)] [@media(max-width:_640px)]:gap-2.5 [@media(max-width:_640px)]:p-[8px_10px]"
								}
								style={{ height: TRACK_HEIGHT }}
							>
								{inner}
							</a>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function Highlight({ text, query }: { text: string; query: string }) {
	const q = query.trim();
	if (!q) return <>{text}</>;
	const idx = text.toLowerCase().indexOf(q.toLowerCase());
	if (idx === -1) return <>{text}</>;
	return (
		<>
			{text.slice(0, idx)}
			<mark
				className={
					"[background:var(--accent-border)] text-accent rounded-(--radius-3xs) p-[0_1px]"
				}
			>
				{text.slice(idx, idx + q.length)}
			</mark>
			{text.slice(idx + q.length)}
		</>
	);
}

function Skeleton() {
	return (
		<div className={"flex flex-col gap-0.75"}>
			{Array.from({ length: 8 }).map((_, i) => (
				<div
					key={i}
					className={`${"flex items-center gap-3.5 p-[9px_14px] rounded-2xl [border:1px_solid_transparent] [transition:all_0.15s] cursor-pointer no-underline text-foreground hover:[background:var(--surface)] hover:border-border [&:hover_.playBtn]:opacity-100 [&:hover_.addToPlaylistBtn]:opacity-100 active:transform-[scale(0.995)] [@media(max-width:_640px)]:gap-2.5 [@media(max-width:_640px)]:p-[8px_10px]"} ${"opacity-[0.4]"}`}
				>
					<span
						className={
							"text-[12px] font-bold font-sans text-muted w-6.25 text-right shrink-0 [@media(max-width:_640px)]:hidden"
						}
					>
						{i + 1}
					</span>
					<div
						className={
							"w-10 h-10 rounded-xs [background:var(--surface2)] [border:1px_solid_var(--border)] shrink-0"
						}
					/>
					<div className={"flex-1 min-w-0"}>
						<div
							className={
								"text-[14px] font-extrabold whitespace-nowrap overflow-hidden text-ellipsis"
							}
							style={{
								background: "var(--color-border-tertiary)",
								borderRadius: 4,
								width: `${120 + (i % 3) * 40}px`,
								height: 14,
							}}
						/>
						<div
							className={`${"text-[12px] font-bold text-muted mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis"} ${"mt-1"}`}
							style={{
								background: "var(--color-border-tertiary)",
								borderRadius: 4,
								width: `${60 + (i % 4) * 20}px`,
								height: 12,
							}}
						/>
					</div>
				</div>
			))}
		</div>
	);
}

export default function FckCensorTabs() {
	const [query, setQuery] = useState("");
	const [playlists, setPlaylists] = useState<Playlist[]>([]);
	const { user } = useAuth();
	const userId = user?.id;

	const { legacy, loaded } = useSyncExternalStore(
		subscribeStore,
		getStoreSnapshot,
		getServerSnapshot,
	);
	const loading = !loaded;

	useEffect(() => {
		ensureTracksLoaded();
	}, []);

	useEffect(() => {
		if (!userId) {
			setPlaylists([]);
			return;
		}
		getPlaylists(userId).then(setPlaylists);
	}, [userId]);

	return (
		<div>
			<SearchBar value={query} onChange={setQuery} />
			{loading ? (
				<Skeleton />
			) : (
				<LegacyList tracks={legacy} query={query} playlists={playlists} />
			)}
		</div>
	);
}
