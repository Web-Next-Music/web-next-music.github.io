"use client";

import Image from "next/image";
import { useVirtualizer } from "@tanstack/react-virtual";

import styles from "./FckCensorTabs.module.scss";

import {
	useState,
	useEffect,
	useRef,
	useMemo,
	useLayoutEffect,
	useSyncExternalStore,
} from "react";
import { TRACK_META, type TrackMeta } from "@/lib/fckcensor";
import {
	ensureTracksLoaded,
	retryTracksLoaded,
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

	const [busy, setBusy] = useState(false);
	const [membershipReady, setMembershipReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const request = useRef(0);
	const pending = useRef(false);
	useEffect(() => {
		request.current += 1;
		pending.current = false;
		setBusy(false);
		setOpen(false);
		setError(null);
		setInPlaylists(new Set());
		setMembershipReady(false);
		return () => {
			request.current += 1;
		};
	}, [trackId, user?.id, isBanned, playlists]);

	if (!user || isBanned) return null;

	const handleOpen = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (open) {
			setOpen(false);
			return;
		}
		if (pending.current) return;
		pending.current = true;
		setBusy(true);
		setError(null);
		const version = request.current;
		try {
			const results = await Promise.all(
				playlists.map((pl) => getPlaylistTracks(pl.id)),
			);
			const containing = new Set<string>();
			playlists.forEach((pl, i) => {
				if (results[i].some((t) => t.track_id === trackId))
					containing.add(pl.id);
			});
			if (version !== request.current) return;
			setInPlaylists(containing);
			setMembershipReady(true);
			setOpen(true);
		} catch {
			if (version === request.current) {
				setError("Failed to load playlist tracks. Try again.");
				setOpen(true);
			}
		} finally {
			if (version === request.current) {
				pending.current = false;
				setBusy(false);
			}
		}
	};

	const handleToggle = async (e: React.MouseEvent, playlistId: string) => {
		e.preventDefault();
		e.stopPropagation();
		if (pending.current) return;
		pending.current = true;
		setBusy(true);
		setError(null);
		const version = request.current;
		try {
			const isIn = inPlaylists.has(playlistId);
			if (isIn) {
				await removeTrackFromPlaylist(playlistId, trackId);
				if (version !== request.current) return;
				setInPlaylists((prev) => {
					const s = new Set(prev);
					s.delete(playlistId);
					return s;
				});
			} else {
				await addTrackToPlaylist(playlistId, trackId, 0);
				if (version !== request.current) return;
				setInPlaylists((prev) => new Set(prev).add(playlistId));
			}
		} catch {
			if (version === request.current)
				setError("Failed to update playlist. Try again.");
		} finally {
			if (version === request.current) {
				pending.current = false;
				setBusy(false);
			}
		}
	};

	return (
		<>
			<button
				ref={btnRef}
				className={styles.addToPlaylistBtnLayout}
				onClick={handleOpen}
				aria-label="Add to playlist"
				disabled={busy}
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
				{error && (
					<div role="alert" className={styles.playlistMenuEmpty}>
						{error}
					</div>
				)}
				{playlists.length === 0 ? (
					<div className={styles.playlistMenuEmpty}>No playlists</div>
				) : (
					playlists.map((pl) => {
						const inPlaylist = inPlaylists.has(pl.id);
						return (
							<button
								key={pl.id}
								type="button"
								role="menuitem"
								disabled={busy || !membershipReady}
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
			className={`${styles.playBtnLayout} ${isThis ? styles.playBtnActive : ""}`}
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
			wrapperClassName={styles.searchWrap}
			size="lg"
			iconSize={16}
			className={styles.textStyle}
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
	const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
	const [scrollMargin, setScrollMargin] = useState(0);

	useLayoutEffect(() => {
		const list = listRef.current;
		const scroller = list?.closest<HTMLElement>("[data-app-scroll]");
		if (!list || !scroller) return;
		setScrollElement(scroller);
		const measure = () => {
			setScrollMargin(
				list.getBoundingClientRect().top -
					scroller.getBoundingClientRect().top +
					scroller.scrollTop,
			);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(scroller);
		if (list.parentElement) observer.observe(list.parentElement);
		window.addEventListener("resize", measure);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, []);

	const virtualizer = useVirtualizer({
		count: filtered.length,
		getScrollElement: () => scrollElement,
		estimateSize: () => TRACK_HEIGHT,
		overscan: BUFFER_SIZE,
		scrollMargin,
		getItemKey: (index) => filtered[index].id,
	});
	const virtualTracks = virtualizer.getVirtualItems();

	return (
		<div ref={listRef} className={styles.list}>
			{filtered.length === 0 && (
				<div className={styles.empty}>
					{query.trim() ? "No results found" : "Failed to load track list"}
				</div>
			)}
			<div
				className={styles.spacer}
				style={{ height: virtualizer.getTotalSize() }}
			>
				<div
					className={styles.content}
					style={{
						transform: `translateY(${(virtualTracks[0]?.start ?? scrollMargin) - scrollMargin}px)`,
					}}
				>
					{virtualTracks.map((item) => {
						const globalIndex = item.index;
						const track = filtered[globalIndex];
						const meta = track.meta;
						const inner = (
							<>
								<span className={styles.numLayout}>{globalIndex + 1}</span>

								{meta?.cover ? (
									<Image
										src={meta.cover}
										alt=""
										width={40}
										height={40}
										className={styles.coverLayout}
										loading="lazy"
									/>
								) : (
									<div className={styles.legacyIconLayout}>
										<Music size={16} color="var(--muted)" />
									</div>
								)}

								<div className={styles.info}>
									<div className={styles.title}>
										<Highlight
											text={meta?.title ?? `Track #${track.id}`}
											query={query}
										/>
									</div>
									<div className={styles.artist}>
										{meta?.artist ? (
											<Highlight text={meta.artist} query={query} />
										) : (
											<span className={styles.idFallback}>ID: {track.id}</span>
										)}
									</div>
								</div>
								<div
									className={styles.rowActions}
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
								className={styles.trackRowLayout}
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
								className={styles.trackRowLayout}
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
			<mark className={styles.highlight}>
				{text.slice(idx, idx + q.length)}
			</mark>
			{text.slice(idx + q.length)}
		</>
	);
}

function Skeleton() {
	return (
		<div className={styles.list}>
			{Array.from({ length: 8 }).map((_, i) => (
				<div
					key={i}
					className={`${styles.trackRowLayout} ${styles.skeletonRow}`}
				>
					<span className={styles.numLayout}>{i + 1}</span>
					<div className={styles.coverPlaceholderLayout} />
					<div className={styles.info}>
						<div
							className={styles.title}
							style={{
								background: "var(--color-border-tertiary)",
								borderRadius: 4,
								width: `${120 + (i % 3) * 40}px`,
								height: 14,
							}}
						/>
						<div
							className={`${styles.artist} ${styles.skeletonArtistLine}`}
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
	const [playlistError, setPlaylistError] = useState<string | null>(null);
	const [playlistReload, setPlaylistReload] = useState(0);
	const [playlists, setPlaylists] = useState<Playlist[]>([]);
	const { user } = useAuth();
	const userId = user?.id;

	const { legacy, loaded, error } = useSyncExternalStore(
		subscribeStore,
		getStoreSnapshot,
		getServerSnapshot,
	);
	const loading = !loaded && !error;

	useEffect(() => {
		ensureTracksLoaded();
	}, []);

	useEffect(() => {
		let active = true;
		setPlaylists([]);
		setPlaylistError(null);
		if (userId) {
			getPlaylists(userId).then(
				(result) => {
					if (active) setPlaylists(result);
				},
				() => {
					if (active) setPlaylistError("Failed to load playlists");
				},
			);
		}
		return () => {
			active = false;
		};
	}, [userId, playlistReload]);

	return (
		<div>
			<SearchBar value={query} onChange={setQuery} />
			{playlistError && (
				<div role="alert" className={styles.playlistMenuEmpty}>
					{playlistError}{" "}
					<button onClick={() => setPlaylistReload((value) => value + 1)}>
						Retry
					</button>
				</div>
			)}
			{error ? (
				<div role="alert" className={styles.empty}>
					{error}{" "}
					<button onClick={() => void retryTracksLoaded()}>Retry</button>
				</div>
			) : loading ? (
				<Skeleton />
			) : (
				<LegacyList tracks={legacy} query={query} playlists={playlists} />
			)}
		</div>
	);
}
