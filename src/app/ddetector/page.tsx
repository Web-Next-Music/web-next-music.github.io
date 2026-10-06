"use client";

import Image from "next/image";

import {
	useState,
	useEffect,
	useLayoutEffect,
	useRef,
	useCallback,
	useMemo,
	startTransition,
} from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
	checkDDetectorAccess,
	fetchDDetectorTracks,
	fetchDDetectorLyrics,
	fetchIgnoredTrackIds,
	addIgnoredTrack,
	removeIgnoredTrack,
	triggerDDetectorFetch,
	type DDetectorTrack,
	type LyricLine,
} from "@/lib/track/ddetector";
import { hasDrugWord, escHtml, highlightDrugs } from "@/lib/track/drugDetector";
import Select from "@components/ui/Select";
import NotFoundView from "@/components/ddetector/NotFoundView";
import TrackRow, {
	type TrackStatus,
	type DrugCard,
	type ContextMenuState,
} from "@/components/ddetector/TrackRow";

// Main page
export default function DDetectorPage() {
	const { user, session, loading: authLoading } = useAuth();

	// Access control
	const [accessChecked, setAccessChecked] = useState(false);
	const [hasAccess, setHasAccess] = useState(false);

	// Data
	const [tracks, setTracks] = useState<DDetectorTrack[]>([]);
	const [lyricsMap, setLyricsMap] = useState<Map<number, LyricLine[] | null>>(
		new Map(),
	);
	const [dataLoading, setDataLoading] = useState(false);

	// Processing state
	const [trackStatus, setTrackStatus] = useState<Map<number, TrackStatus>>(
		new Map(),
	);
	const [drugCards, setDrugCards] = useState<DrugCard[]>([]);
	const [processed, setProcessed] = useState(0);
	const [foundCount, setFoundCount] = useState(0);

	// Search & sort
	const searchInputRef = useRef<HTMLInputElement>(null);
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<"default" | "date" | "alpha" | "artist">(
		"default",
	);

	// Fetch button
	const [fetching, setFetching] = useState(false);

	// Toast
	const [toast, setToast] = useState("");
	const [toastVisible, setToastVisible] = useState(false);
	const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Ignored tracks
	const [ignoredIds, setIgnoredIds] = useState<Set<number>>(new Set());

	const [rightOpen, setRightOpen] = useState(false);

	// Active track
	const [activeId, setActiveId] = useState<number | null>(null);
	const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

	// Header context menu (global settings)
	const [headerCtxMenu, setHeaderCtxMenu] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const headerCtxMenuRef = useRef<HTMLDivElement>(null);

	// Hide ignored tracks (persisted)
	const [hideIgnored, setHideIgnored] = useState(() => {
		try {
			return localStorage.getItem("ddetector:hideIgnored") === "1";
		} catch {
			return false;
		}
	});

	const toggleHideIgnored = useCallback(() => {
		setHideIgnored((v) => {
			const next = !v;
			try {
				localStorage.setItem("ddetector:hideIgnored", next ? "1" : "0");
			} catch {}
			return next;
		});
	}, []);

	// Context menu
	const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
	const ctxMenuRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!ctxMenu || !ctxMenuRef.current) return;
		const el = ctxMenuRef.current;
		const rect = el.getBoundingClientRect();
		let { x, y } = ctxMenu;
		if (x + rect.width > window.innerWidth)
			x = window.innerWidth - rect.width - 8;
		if (y + rect.height > window.innerHeight)
			y = window.innerHeight - rect.height - 8;
		el.style.left = `${x}px`;
		el.style.top = `${y}px`;
	}, [ctxMenu]);

	useLayoutEffect(() => {
		if (!headerCtxMenu || !headerCtxMenuRef.current) return;
		const el = headerCtxMenuRef.current;
		const rect = el.getBoundingClientRect();
		let { x, y } = headerCtxMenu;
		if (x + rect.width > window.innerWidth)
			x = window.innerWidth - rect.width - 8;
		if (y + rect.height > window.innerHeight)
			y = window.innerHeight - rect.height - 8;
		el.style.left = `${x}px`;
		el.style.top = `${y}px`;
	}, [headerCtxMenu]);

	// Expanded full-lyrics cards (for unsynced tracks)
	const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

	const toggleExpanded = useCallback((id: number) => {
		setExpandedCards((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	// Close context menu on outside click / scroll / Escape
	useEffect(() => {
		if (!ctxMenu) return;
		const close = (e: MouseEvent) => {
			if (!ctxMenuRef.current?.contains(e.target as Node)) setCtxMenu(null);
		};
		const closeKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setCtxMenu(null);
		};
		const closeOnScroll = () => setCtxMenu(null);
		document.addEventListener("mousedown", close);
		document.addEventListener("scroll", closeOnScroll, true);
		document.addEventListener("keydown", closeKey);
		return () => {
			document.removeEventListener("mousedown", close);
			document.removeEventListener("scroll", closeOnScroll, true);
			document.removeEventListener("keydown", closeKey);
		};
	}, [ctxMenu]);

	// Close header context menu on outside click / scroll / Escape
	useEffect(() => {
		if (!headerCtxMenu) return;
		const close = (e: MouseEvent) => {
			if (!headerCtxMenuRef.current?.contains(e.target as Node))
				setHeaderCtxMenu(null);
		};
		const closeKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setHeaderCtxMenu(null);
		};
		const closeOnScroll = () => setHeaderCtxMenu(null);
		document.addEventListener("mousedown", close);
		document.addEventListener("scroll", closeOnScroll, true);
		document.addEventListener("keydown", closeKey);
		return () => {
			document.removeEventListener("mousedown", close);
			document.removeEventListener("scroll", closeOnScroll, true);
			document.removeEventListener("keydown", closeKey);
		};
	}, [headerCtxMenu]);

	const handleTrackContextMenu = useCallback(
		(e: React.MouseEvent, track: DDetectorTrack) => {
			e.preventDefault();
			setCtxMenu({ x: e.clientX, y: e.clientY, track });
		},
		[],
	);

	const handleCardContextMenu = useCallback(
		(e: React.MouseEvent, track: DDetectorTrack, hasAllLines: boolean) => {
			e.preventDefault();
			setCtxMenu({ x: e.clientX, y: e.clientY, track, hasAllLines });
		},
		[],
	);

	const handleToggleIgnore = useCallback(
		async (track: DDetectorTrack) => {
			setCtxMenu(null);
			const isIgnored = ignoredIds.has(track.id);
			if (isIgnored) {
				setIgnoredIds((prev) => {
					const next = new Set(prev);
					next.delete(track.id);
					return next;
				});
				await removeIgnoredTrack(track.id);
			} else {
				setIgnoredIds((prev) => new Set(prev).add(track.id));
				await addIgnoredTrack(track.id);
			}
		},
		[ignoredIds],
	);

	// Check access
	useEffect(() => {
		if (authLoading) return;
		if (!user) {
			setAccessChecked(true);
			setHasAccess(false);
			return;
		}
		checkDDetectorAccess(user.id)
			.then((ok) => {
				setHasAccess(ok);
				setAccessChecked(true);
				if (ok) document.title = "DDetector";
			})
			.catch(() => {
				setHasAccess(false);
				setAccessChecked(true);
			});
	}, [authLoading, user]);

	// Load data when access granted
	useEffect(() => {
		if (!hasAccess) return;
		setDataLoading(true);
		Promise.all([
			fetchDDetectorTracks(),
			fetchDDetectorLyrics(),
			fetchIgnoredTrackIds(),
		])
			.then(([t, l, ignored]) => {
				setTracks(t);
				setLyricsMap(l);
				setIgnoredIds(ignored);
				setTrackStatus(new Map(t.map((tr) => [tr.id, "pending"])));
			})
			.catch((e) => console.error("DDetector data load:", e))
			.finally(() => setDataLoading(false));
	}, [hasAccess]);

	// Process tracks against lyrics
	useEffect(() => {
		if (!tracks.length || dataLoading) return;

		let cancelled = false;
		setProcessed(0);
		setFoundCount(0);
		setDrugCards([]);

		const newStatus = new Map<number, TrackStatus>(
			tracks.map((t) => [t.id, "pending"]),
		);
		setTrackStatus(new Map(newStatus));

		let proc = 0;
		let found = 0;
		const accumCards: DrugCard[] = [];
		const FLUSH = 50;

		(async () => {
			for (const track of tracks) {
				if (cancelled) return;

				const lyrics = lyricsMap.has(track.id)
					? lyricsMap.get(track.id)
					: undefined;

				let status: TrackStatus;
				if (lyrics == null) {
					status = "error";
				} else {
					const drugLines = lyrics
						.filter((l) => hasDrugWord(l.text))
						.map((l) => ({ ts: l.ts, html: highlightDrugs(l.text) }));
					if (drugLines.length > 0) {
						status = "found";
						found++;
						const isUnsynced = lyrics.every((l) => l.ts === null);
						const card: DrugCard = { track, lines: drugLines };
						if (isUnsynced) {
							card.allLines = lyrics.map((l) => ({
								ts: l.ts,
								html: hasDrugWord(l.text)
									? highlightDrugs(l.text)
									: escHtml(l.text),
								isDrug: hasDrugWord(l.text),
							}));
						}
						accumCards.push(card);
					} else {
						status = "none";
					}
				}

				newStatus.set(track.id, status);
				proc++;

				if (proc % FLUSH === 0 || proc === tracks.length) {
					setTrackStatus(new Map(newStatus));
					setProcessed(proc);
					setFoundCount(found);
					setDrugCards(accumCards.slice());
					await new Promise((r) => setTimeout(r, 0));
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [tracks, lyricsMap, dataLoading]);

	// Toast helper
	const showToast = useCallback((msg: string) => {
		setToast(msg);
		setToastVisible(true);
		if (toastTimer.current) clearTimeout(toastTimer.current);
		toastTimer.current = setTimeout(() => setToastVisible(false), 3500);
	}, []);

	// Handlers
	const handleTrackClick = useCallback(
		(track: DDetectorTrack) => {
			const id = String(track.id);
			navigator.clipboard?.writeText(id).catch(() => {});
			showToast(`ID copied: ${id}`);
			startTransition(() => {
				setActiveId(track.id);
			});
			const card = cardRefs.current.get(track.id);
			if (card) {
				setRightOpen(true);
				card.scrollIntoView({ behavior: "smooth", block: "nearest" });
			}
		},
		[showToast],
	);

	async function handleFetch() {
		if (!session?.access_token) return;
		setFetching(true);
		try {
			const result = await triggerDDetectorFetch(session.access_token);
			if (result.ok) {
				showToast(
					`Done: ${result.total} tracks, +${result.added} added, −${result.removed} removed, ${result.lyrics_fetched ?? 0} lyrics fetched`,
				);
				const [t, l] = await Promise.all([
					fetchDDetectorTracks(),
					fetchDDetectorLyrics(),
				]);
				setTracks(t);
				setLyricsMap(l);
			} else {
				showToast(`Error: ${result.error}`);
			}
		} catch (err) {
			showToast(`Error: ${String(err)}`);
		} finally {
			setFetching(false);
		}
	}

	// Filtered + sorted list
	const filteredTracks = useMemo(() => {
		const q = search.trim().toLowerCase();
		let list = q
			? tracks.filter(
					(t) =>
						t.title.toLowerCase().includes(q) ||
						t.artist.toLowerCase().includes(q) ||
						String(t.id).includes(q),
				)
			: tracks;
		if (hideIgnored) list = list.filter((t) => !ignoredIds.has(t.id));
		if (sort === "date") {
			list = [...list].sort((a, b) => {
				const da = a.added_at ? new Date(a.added_at).getTime() : 0;
				const db = b.added_at ? new Date(b.added_at).getTime() : 0;
				return db - da;
			});
		} else if (sort === "alpha") {
			list = [...list].sort((a, b) => a.title.localeCompare(b.title));
		} else if (sort === "artist") {
			const artistCount = new Map<string, number>();
			for (const t of list) {
				artistCount.set(t.artist, (artistCount.get(t.artist) ?? 0) + 1);
			}
			list = [...list].sort((a, b) => {
				const diff =
					(artistCount.get(b.artist) ?? 0) - (artistCount.get(a.artist) ?? 0);
				if (diff !== 0) return diff;
				return a.artist.localeCompare(b.artist);
			});
		}
		return list;
	}, [tracks, search, sort, hideIgnored, ignoredIds]);

	const trackDates = useMemo(() => {
		const map = new Map<number, string>();
		for (const t of tracks) {
			if (!t.added_at) continue;
			const d = new Date(t.added_at);
			const mm = String(d.getMonth() + 1).padStart(2, "0");
			const dd = String(d.getDate()).padStart(2, "0");
			map.set(t.id, `${mm}/${dd}/${d.getFullYear()}`);
		}
		return map;
	}, [tracks]);

	const progressPct = tracks.length ? (processed / tracks.length) * 100 : 0;

	// Render states

	if (authLoading || !accessChecked) {
		return (
			<>
				<Header />
				<div
					className={
						"flex flex-col items-center justify-center gap-3.5 min-h-[60vh] text-center"
					}
				>
					<div
						className={
							"flex gap-1.5 items-center [&_span]:w-1.75 [&_span]:h-1.75 [&_span]:rounded-(--radius-full) [&_span]:[background:var(--accent)] [&_span]:opacity-[0.4] [&_span]:animate-[dotPulse_1.2s_ease-in-out_infinite] [&_span:nth-child(2)]:[animation-delay:0.2s] [&_span:nth-child(3)]:[animation-delay:0.4s]"
						}
					>
						<span />
						<span />
						<span />
					</div>
				</div>
				<Footer />
			</>
		);
	}

	// Not privileged → 404
	if (!hasAccess) {
		return (
			<>
				<Header />
				<NotFoundView />
				<Footer />
			</>
		);
	}

	// Main UI
	return (
		<div
			className={"h-full flex flex-col overflow-hidden [background:var(--bg)]"}
		>
			{/* Header */}
			<div
				className={
					"shrink-0 flex items-center gap-2.5 p-[10px_10px_10px_20px] [border-bottom:1px_solid_var(--border)] [background:var(--header)] z-10 h-15 [@media(max-width:_600px)]:flex-wrap [@media(max-width:_600px)]:p-2.5 [@media(max-width:_600px)]:gap-1.5 [@media(max-width:_600px)]:h-20"
				}
				onContextMenu={(e) => {
					e.preventDefault();
					setHeaderCtxMenu({ x: e.clientX, y: e.clientY });
				}}
			>
				<Link
					href="/"
					className={
						"text-[18px] font-bold text-foreground shrink-0 font-(family-name:--font-heading-large) no-underline [&_span]:text-accent"
					}
				>
					D<span>Detector</span>
				</Link>
				<div className={"text-[12px] font-bold text-muted shrink-0"}>
					{filteredTracks.length} tracks
				</div>

				<div
					className={
						"flex items-center gap-2 flex-1 min-w-0 justify-end [@media(max-width:_600px)]:basis-full"
					}
				>
					<Select
						value={sort}
						onChange={setSort}
						options={[
							{ value: "default", label: "Default" },
							{ value: "date", label: "By date" },
							{ value: "alpha", label: "A - Z" },
							{ value: "artist", label: "By artist" },
						]}
					/>

					<div
						className={"flex-1 max-w-75 [@media(max-width:_600px)]:max-w-none"}
					>
						<input
							ref={searchInputRef}
							className={
								"w-full [background:var(--surface)] [border:1px_solid_var(--border)] rounded-2xl p-[6px_12px] text-foreground text-[13px] font-bold outline-none [transition:border-color_0.15s] font-sans focus:border-(--accent2) placeholder:text-muted placeholder:opacity-[0.6]"
							}
							type="text"
							placeholder="Search (Enter)"
							onKeyDown={(e) => {
								if (e.key === "Enter")
									setSearch(searchInputRef.current?.value ?? "");
							}}
						/>
					</div>

					<button
						className={
							"flex items-center justify-center text-center gap-1.5 p-[6px_14px] rounded-sm [border:1px_solid_var(--border)] [background:var(--surface)] text-muted text-[12px] font-bold cursor-pointer w-25 [transition:color_0.15s,border-color_0.15s,background_0.15s] font-sans [&:hover:not(:disabled)]:text-accent [&:hover:not(:disabled)]:border-accent [&:hover:not(:disabled)]:[background:var(--accent-btn-hover)] disabled:opacity-[0.5] disabled:cursor-not-allowed [@media(max-width:_600px)]:shrink-0"
						}
						onClick={handleFetch}
						disabled={fetching || !session}
						title="Rebuild track list from external source"
					>
						{fetching ? (
							<svg
								className={
									"w-3.25 h-3.25 shrink-0 animate-[nm-spin_0.75s_linear_infinite]"
								}
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<circle
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeOpacity="0.25"
									strokeWidth="3"
								/>
								<path
									d="M12 2a10 10 0 0 1 10 10"
									stroke="currentColor"
									strokeWidth="3"
									strokeLinecap="round"
								/>
							</svg>
						) : null}
						{fetching ? "Fetching" : "Fetch"}
					</button>
				</div>
			</div>

			{dataLoading ? (
				<div
					className={
						"flex-1 flex font-bold items-center justify-center text-muted text-[13px]"
					}
				>
					Loading tracks...
				</div>
			) : (
				<div
					className={
						"flex flex-1 overflow-hidden min-h-0 mt-(--mini-player-h) [@media(max-width:_600px)]:flex-col [@media(max-width:_600px)]:relative [@media(max-width:_600px)]:overflow-hidden"
					}
				>
					{/* Left: track list */}
					<div
						className={
							"w-[50%] [border-right:1px_solid_var(--border)] overflow-y-auto p-2.5 [@media(max-width:_600px)]:w-full [@media(max-width:_600px)]:flex-1 [@media(max-width:_600px)]:min-h-0 [@media(max-width:_600px)]:[border-right:none] [@media(max-width:_600px)]:[border-bottom:none] [@media(max-width:_600px)]:pb-18"
						}
					>
						{filteredTracks.map((track, i) => (
							<TrackRow
								key={track.id}
								track={track}
								index={i}
								status={trackStatus.get(track.id) ?? "pending"}
								date={trackDates.get(track.id)}
								isActive={activeId === track.id}
								isIgnored={ignoredIds.has(track.id)}
								onClick={handleTrackClick}
								onContextMenu={handleTrackContextMenu}
							/>
						))}
					</div>

					<div
						className={`${"w-[50%] overflow-y-auto p-2.5 [@media(max-width:_600px)]:absolute [@media(max-width:_600px)]:bottom-0 [@media(max-width:_600px)]:left-0 [@media(max-width:_600px)]:right-0 [@media(max-width:_600px)]:h-full [@media(max-width:_600px)]:w-full [@media(max-width:_600px)]:flex [@media(max-width:_600px)]:flex-col [@media(max-width:_600px)]:[background:var(--bg)] [@media(max-width:_600px)]:p-0 [@media(max-width:_600px)]:[border-top:1px_solid_var(--border)] [@media(max-width:_600px)]:transform-[translateY(calc(100%-60px))] [@media(max-width:_600px)]:[transition:transform_0.32s_cubic-bezier(0.4,0,0.2,1)] [@media(max-width:_600px)]:z-20 [@media(max-width:_600px)]:overflow-y-hidden"}${rightOpen ? ` ${"[@media(max-width:_600px)]:transform-[translateY(-1px)]"}` : ""}`}
					>
						<button
							className={
								"hidden [@media(max-width:_600px)]:flex [@media(max-width:_600px)]:items-center [@media(max-width:_600px)]:justify-center [@media(max-width:_600px)]:w-full [@media(max-width:_600px)]:h-9 [@media(max-width:_600px)]:shrink-0 [@media(max-width:_600px)]:[background:transparent] [@media(max-width:_600px)]:[border:none] [@media(max-width:_600px)]:cursor-pointer [@media(max-width:_600px)]:text-muted [@media(max-width:_600px)]:[transition:color_0.15s] [@media(max-width:_600px)]:hover:text-foreground"
							}
							onClick={() => setRightOpen((v) => !v)}
							aria-label={rightOpen ? "Collapse results" : "Expand results"}
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								className={`${"[transition:transform_0.3s_cubic-bezier(0.4,0,0.2,1)]"}${rightOpen ? ` ${"transform-[rotate(-180deg)]"}` : ""}`}
							>
								<polyline points="18 15 12 9 6 15" />
							</svg>
						</button>
						<div
							className={
								"shrink-0 flex items-center gap-2.5 p-[0_10px_10px] [border-bottom:1px_solid_var(--border)] mb-2.5 [@media(max-width:_600px)]:mb-0"
							}
						>
							<span
								className={
									"text-[11px] font-bold text-muted shrink-0 whitespace-nowrap"
								}
							>
								{processed < tracks.length
									? `Scanning ${processed} / ${tracks.length}`
									: tracks.length
										? `Done · ${tracks.length} tracks`
										: "No tracks"}
							</span>
							<div
								className={
									"flex-1 h-0.5 [background:var(--surface2)] rounded-(--radius-3xs) overflow-hidden"
								}
							>
								<div
									className={
										"h-full [background:var(--accent)] rounded-md [transition:width_0.35s_ease]"
									}
									style={{ width: `${progressPct}%` }}
								/>
							</div>
							{foundCount > 0 && (
								<span
									className={
										"text-[11px] text-accent shrink-0 whitespace-nowrap font-bold"
									}
								>
									{foundCount} with hits
								</span>
							)}
						</div>

						<div
							className={
								"flex flex-col gap-2.5 [@media(max-width:_600px)]:overflow-y-auto [@media(max-width:_600px)]:flex-1 [@media(max-width:_600px)]:min-h-0 [@media(max-width:_600px)]:p-2.5"
							}
						>
							{drugCards.length === 0 && processed === tracks.length && (
								<div
									className={
										"text-center text-muted p-[60px_24px] text-[13px] opacity-[0.6] leading-[1.7]"
									}
								>
									{tracks.length
										? "No drug references found"
										: "No tracks. Press Fetch to load."}
								</div>
							)}

							{drugCards
								.filter((c) => !hideIgnored || !ignoredIds.has(c.track.id))
								.map(({ track, lines, allLines }) => {
									const isExpanded = expandedCards.has(track.id);
									const isIgnored = ignoredIds.has(track.id);
									const displayLines =
										isExpanded && allLines ? allLines : lines;
									return (
										<div
											key={track.id}
											className={`${"[background:var(--surface)] [border:1px_solid_var(--border)] rounded-md overflow-hidden animate-[nm-card-in_0.2s_ease] shrink-0"}${isIgnored ? ` ${"border-(--ignore-border-strong) [&_.drugCardHead]:[background:var(--ignore-bg-surface)] [&_.drugCardHead]:border-b-(--ignore-border) [&_.drugLines]:[background:var(--ignore-bg-lines)] [&_.drugTs]:text-(--ignore-accent-dim) [&_.drugMark]:[background:var(--ignore-mark-bg)] [&_.drugMark]:text-(--ignore-mark-color) [&_.btnYandex]:[background:var(--ignore-bg-subtle)] [&_.btnYandex]:border-(--ignore-border) [&_.btnYandex]:text-(--ignore-accent) [&_.btnYandex:hover]:[background:var(--ignore-mark-bg)] [&_.btnExpand:hover]:text-(--ignore-accent) [&_.btnExpand:hover]:border-(--ignore-border-hover) [&_.btnExpand:hover]:[background:var(--ignore-bg-btn)] [&_.btnExpandActive]:text-(--ignore-accent) [&_.btnExpandActive]:border-(--ignore-outline) [&_.btnExpandActive]:[background:var(--ignore-bg-subtle)] [&_.drugLine]:[border-bottom:1px_solid_var(--ignore-border)] [&_.drugLine:hover]:[background:var(--ignore-bg-btn)]"}` : ""}`}
											ref={(el) => {
												if (el) cardRefs.current.set(track.id, el);
												else cardRefs.current.delete(track.id);
											}}
											onContextMenu={(e) =>
												handleCardContextMenu(e, track, !!allLines)
											}
										>
											<div
												className={
													"in-[.drugCardIgnored]:[background:var(--ignore-bg-surface)] in-[.drugCardIgnored]:border-b-(--ignore-border) flex items-center gap-2.5 p-[10px_16px_10px_10px] [background:var(--surface2)] [border-bottom:1px_solid_var(--border)]"
												}
											>
												<div
													className={
														"w-8 h-8 rounded-(--radius-2xs) [background:var(--bg)] shrink-0 overflow-hidden [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:block"
													}
												>
													{track.cover ? (
														<Image
															src={track.cover}
															alt=""
															width={40}
															height={40}
															loading="lazy"
														/>
													) : (
														<div
															className={
																"w-full h-full flex items-center justify-center text-border text-[15px]"
															}
														>
															♪
														</div>
													)}
												</div>
												<div className={"flex-1 min-w-0"}>
													<div
														className={
															"text-[12px] font-extrabold text-foreground whitespace-nowrap overflow-hidden text-ellipsis"
														}
													>
														{track.title}
													</div>
													<div
														className={
															"text-[11px] font-bold text-muted whitespace-nowrap overflow-hidden text-ellipsis mt-px"
														}
													>
														{track.artist}
													</div>
												</div>
												<div className={"flex gap-1.5 shrink-0"}>
													{allLines && (
														<button
															className={`${"text-[10px] font-semibold p-[4px_10px] rounded-xs cursor-pointer [border:1px_solid_transparent] [transition:background_0.12s,color_0.12s] whitespace-nowrap no-underline inline-flex items-center gap-1 leading-none font-sans"} ${"[.drugCardIgnored_&:hover]:text-(--ignore-accent) [.drugCardIgnored_&:hover]:border-(--ignore-border-hover) [.drugCardIgnored_&:hover]:[background:var(--ignore-bg-btn)] [background:var(--surface)] border-border text-muted font-bold hover:[background:var(--bg)] hover:text-(--accent2) hover:border-(--accent2)"}${isExpanded ? ` ${"in-[.drugCardIgnored]:text-(--ignore-accent) in-[.drugCardIgnored]:border-(--ignore-outline) in-[.drugCardIgnored]:[background:var(--ignore-bg-subtle)] text-(--accent2) border-(--accent-border-strong) [background:var(--accent-btn-hover)]"}` : ""}`}
															onClick={(e) => {
																e.stopPropagation();
																toggleExpanded(track.id);
															}}
														>
															{isExpanded ? "Collapse" : "Full lyrics"}
														</button>
													)}
													<button
														className={`${"text-[10px] font-semibold p-[4px_10px] rounded-xs cursor-pointer [border:1px_solid_transparent] [transition:background_0.12s,color_0.12s] whitespace-nowrap no-underline inline-flex items-center gap-1 leading-none font-sans"} ${"[background:var(--surface)] border-border text-muted font-bold hover:[background:var(--bg)] hover:text-foreground"}`}
														onClick={(e) => {
															e.stopPropagation();
															navigator.clipboard?.writeText(String(track.id));
															showToast(`ID copied: ${track.id}`);
														}}
													>
														Copy ID
													</button>
													<a
														className={`${"text-[10px] font-semibold p-[4px_10px] rounded-xs cursor-pointer [border:1px_solid_transparent] [transition:background_0.12s,color_0.12s] whitespace-nowrap no-underline inline-flex items-center gap-1 leading-none font-sans"} ${"in-[.drugCardIgnored]:[background:var(--ignore-bg-subtle)] in-[.drugCardIgnored]:border-(--ignore-border) in-[.drugCardIgnored]:text-(--ignore-accent) [.drugCardIgnored_&:hover]:[background:var(--ignore-mark-bg)] [background:var(--accent-surface)] border-(--accent-border) text-accent font-bold hover:[background:var(--accent-surface-hover)]"}`}
														href={`https://yandex.ru/search/?text=${encodeURIComponent(`${track.title} ${track.artist} скачать mp3`)}`}
														target="_blank"
														rel="noopener noreferrer"
													>
														Yandex
													</a>
												</div>
											</div>

											<div
												className={`${"in-[.drugCardIgnored]:[background:var(--ignore-bg-lines)]"}${allLines ? ` ${"[&_.drugTs]:hidden"}` : ""}`}
											>
												{displayLines.map((line, li) => {
													const isContext =
														"isDrug" in line && line.isDrug === false;
													return (
														<div
															key={li}
															className={`${"in-[.drugCardIgnored]:[border-bottom:1px_solid_var(--ignore-border)] [.drugCardIgnored_&:hover]:[background:var(--ignore-bg-btn)] flex gap-2.5 items-baseline p-[5px_12px] [border-bottom:1px_solid_var(--border)] [transition:background_0.1s] hover:[background:var(--accent-bg-hover)] last:[border-bottom:none]"}${isContext ? ` ${"opacity-[0.45] hover:opacity-[0.7] hover:[background:transparent]"}` : ""}`}
														>
															<span
																className={
																	'in-[.drugCardIgnored]:text-(--ignore-accent-dim) text-[10px] font-bold text-accent [font-variant-numeric:tabular-nums] shrink-0 font-["SF_Mono","Fira_Code",monospace] min-w-11.5 opacity-[0.8] in-[.drugLinesNoTs]:hidden'
																}
															>
																{line.ts ?? "—:——"}
															</span>
															<span
																className={
																	"text-[12px] font-bold text-foreground leading-[1.55] opacity-[0.85]"
																}
																dangerouslySetInnerHTML={{ __html: line.html }}
															/>
														</div>
													);
												})}
											</div>
										</div>
									);
								})}
						</div>
					</div>
				</div>
			)}

			{/* Context menu */}
			{ctxMenu && (
				<div
					ref={ctxMenuRef}
					className={
						"fixed z-300 min-w-45 [background:var(--surface2)] [border:1px_solid_var(--border)] rounded-md p-1 [box-shadow:var(--shadow-overlay)]"
					}
					style={{ top: ctxMenu.y, left: ctxMenu.x }}
				>
					<div className={"flex flex-col gap-px p-1.5"}>
						<span
							className={
								"text-[12px] font-extrabold text-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-50"
							}
						>
							{ctxMenu.track.title}
						</span>
						<span
							className={
								"text-[10px] font-bold text-muted whitespace-nowrap overflow-hidden text-ellipsis max-w-50 opacity-[0.7]"
							}
						>
							{ctxMenu.track.artist}
						</span>
					</div>
					<div className={"h-px [background:var(--border)] m-[2px_0]"} />
					<a
						className={
							"flex items-center gap-2 w-full p-[6px_10px] rounded-xs text-[12px] font-bold text-foreground [background:transparent] [border:none] cursor-pointer no-underline font-sans [transition:background_0.1s,color_0.1s] [&_svg]:shrink-0 [&_svg]:text-muted [&_svg]:[transition:color_0.1s] hover:[background:var(--surface)] hover:text-accent [&:hover_svg]:text-accent"
						}
						href={`https://yandex.ru/search/?text=${encodeURIComponent(`${ctxMenu.track.title} ${ctxMenu.track.artist} скачать mp3`)}`}
						target="_blank"
						rel="noopener noreferrer"
						onClick={() => setCtxMenu(null)}
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
							<circle
								cx="11"
								cy="11"
								r="8"
								stroke="currentColor"
								strokeWidth="2"
							/>
							<path
								d="M21 21l-4.35-4.35"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</svg>
						Search on Yandex
					</a>
					<button
						className={
							"flex items-center gap-2 w-full p-[6px_10px] rounded-xs text-[12px] font-bold text-foreground [background:transparent] [border:none] cursor-pointer no-underline font-sans [transition:background_0.1s,color_0.1s] [&_svg]:shrink-0 [&_svg]:text-muted [&_svg]:[transition:color_0.1s] hover:[background:var(--surface)] hover:text-accent [&:hover_svg]:text-accent"
						}
						onClick={() => {
							navigator.clipboard?.writeText(String(ctxMenu.track.id));
							showToast(`ID copied: ${ctxMenu.track.id}`);
							setCtxMenu(null);
						}}
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
							<rect
								x="9"
								y="9"
								width="13"
								height="13"
								rx="2"
								stroke="currentColor"
								strokeWidth="2"
							/>
							<path
								d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
								stroke="currentColor"
								strokeWidth="2"
							/>
						</svg>
						Copy track ID
					</button>
					<div className={"h-px [background:var(--border)] m-[2px_0]"} />
					{ctxMenu.hasAllLines && (
						<button
							className={
								"flex items-center gap-2 w-full p-[6px_10px] rounded-xs text-[12px] font-bold text-foreground [background:transparent] [border:none] cursor-pointer no-underline font-sans [transition:background_0.1s,color_0.1s] [&_svg]:shrink-0 [&_svg]:text-muted [&_svg]:[transition:color_0.1s] hover:[background:var(--surface)] hover:text-accent [&:hover_svg]:text-accent"
							}
							onClick={() => {
								toggleExpanded(ctxMenu.track.id);
								setCtxMenu(null);
							}}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
								<path
									d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							{expandedCards.has(ctxMenu.track.id) ? "Collapse" : "Full lyrics"}
						</button>
					)}
					<button
						className={`${"flex items-center gap-2 w-full p-[6px_10px] rounded-xs text-[12px] font-bold text-foreground [background:transparent] [border:none] cursor-pointer no-underline font-sans [transition:background_0.1s,color_0.1s] [&_svg]:shrink-0 [&_svg]:text-muted [&_svg]:[transition:color_0.1s] hover:[background:var(--surface)] hover:text-accent [&:hover_svg]:text-accent"} ${ignoredIds.has(ctxMenu.track.id) ? "text-muted hover:[background:var(--surface)] hover:text-accent" : "text-(--ignore-accent) [&_svg]:text-(--ignore-accent-dim) hover:[background:var(--ignore-bg)] hover:text-(--ignore-mark-hover-color) [&:hover_svg]:text-(--ignore-mark-hover-color)"}`}
						onClick={() => handleToggleIgnore(ctxMenu.track)}
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
							<path
								d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							{ignoredIds.has(ctxMenu.track.id) && (
								<path
									d="M9 12l2 2 4-4"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							)}
						</svg>
						{ignoredIds.has(ctxMenu.track.id) ? "Unignore" : "Ignore"}
					</button>
				</div>
			)}

			{/* Header context menu */}
			{headerCtxMenu && (
				<div
					ref={headerCtxMenuRef}
					className={
						"fixed z-300 min-w-45 [background:var(--surface2)] [border:1px_solid_var(--border)] rounded-md p-1 [box-shadow:var(--shadow-overlay)]"
					}
					style={{ top: headerCtxMenu.y, left: headerCtxMenu.x }}
				>
					<button
						className={
							"flex items-center gap-2 w-full p-[6px_10px] rounded-xs text-[12px] font-bold text-foreground [background:transparent] [border:none] cursor-pointer no-underline font-sans [transition:background_0.1s,color_0.1s] [&_svg]:shrink-0 [&_svg]:text-muted [&_svg]:[transition:color_0.1s] hover:[background:var(--surface)] hover:text-accent [&:hover_svg]:text-accent"
						}
						onClick={() => {
							toggleHideIgnored();
							setHeaderCtxMenu(null);
						}}
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
							{hideIgnored ? (
								<>
									<path
										d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<circle
										cx="12"
										cy="12"
										r="3"
										stroke="currentColor"
										strokeWidth="2"
									/>
								</>
							) : (
								<>
									<path
										d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<line
										x1="1"
										y1="1"
										x2="23"
										y2="23"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
									/>
								</>
							)}
						</svg>
						{hideIgnored ? "Show ignored tracks" : "Hide ignored tracks"}
					</button>
				</div>
			)}

			{/* Toast */}
			<div
				className={`${"fixed top-2.25 left-[50%] transform-[translateX(-50%)_translateY(-14px)] [background:var(--surface2)] [border:1px_solid_var(--border)] text-foreground p-[8px_16px] rounded-sm text-[12px] font-bold opacity-0 [transition:opacity_0.18s,transform_0.18s] pointer-events-none whitespace-nowrap z-(--z-popover) [&.toastShow]:opacity-100 [&.toastShow]:transform-[translateX(-50%)_translateY(0)]"}${toastVisible ? ` ${"[.toast&]:opacity-100 [.toast&]:transform-[translateX(-50%)_translateY(0)]"}` : ""}`}
			>
				{toast}
			</div>
		</div>
	);
}
