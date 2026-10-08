"use client";

import Image from "next/image";
import useContextMenu from "@/components/ddetector/useContextMenu";

import {
	useState,
	useEffect,
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
import { annotateDrugLine } from "@/lib/track/drugDetector";
import Select from "@components/ui/Select";
import NotFoundView from "@/components/ddetector/NotFoundView";
import TrackRow, {
	type TrackStatus,
	type DrugCard,
	type ContextMenuState,
} from "@/components/ddetector/TrackRow";
import styles from "./page.module.scss";

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
	const headerCtxMenuRef = useContextMenu(
		headerCtxMenu,
		useCallback(() => setHeaderCtxMenu(null), []),
	);

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
	const ctxMenuRef = useContextMenu(
		ctxMenu,
		useCallback(() => setCtxMenu(null), []),
	);

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

	const identity = `${authLoading}:${user?.id ?? ""}`;
	const currentIdentity = useRef(identity);
	currentIdentity.current = identity;
	const generation = useRef(0);
	const pendingIgnore = useRef(new Set<number>());
	const [accessIdentity, setAccessIdentity] = useState("");
	const [loadError, setLoadError] = useState("");

	const handleToggleIgnore = useCallback(
		async (track: DDetectorTrack) => {
			setCtxMenu(null);
			if (pendingIgnore.current.has(track.id)) return;
			const owner = currentIdentity.current;
			const epoch = generation.current;
			const wasIgnored = ignoredIds.has(track.id);
			pendingIgnore.current.add(track.id);
			const update = (ignored: boolean) =>
				setIgnoredIds((prev) => {
					const next = new Set(prev);
					if (ignored) next.add(track.id);
					else next.delete(track.id);
					return next;
				});
			update(!wasIgnored);
			try {
				await (wasIgnored
					? removeIgnoredTrack(track.id)
					: addIgnoredTrack(track.id));
			} catch {
				if (currentIdentity.current === owner && generation.current === epoch) {
					update(wasIgnored);
					setToast("Error: failed to update ignored track");
					setToastVisible(true);
					if (toastTimer.current) clearTimeout(toastTimer.current);
					toastTimer.current = setTimeout(() => setToastVisible(false), 3500);
				}
			} finally {
				if (generation.current === epoch)
					pendingIgnore.current.delete(track.id);
			}
		},
		[ignoredIds],
	);

	useEffect(() => {
		let cancelled = false;
		generation.current++;
		setAccessChecked(false);
		setHasAccess(false);
		setAccessIdentity("");
		setTracks([]);
		setLyricsMap(new Map());
		setIgnoredIds(new Set());
		setTrackStatus(new Map());
		setDrugCards([]);
		setProcessed(0);
		setFoundCount(0);
		setActiveId(null);
		setExpandedCards(new Set());
		setCtxMenu(null);
		setHeaderCtxMenu(null);
		setFetching(false);
		setToastVisible(false);
		setLoadError("");
		setDataLoading(false);
		pendingIgnore.current.clear();
		if (toastTimer.current) clearTimeout(toastTimer.current);
		if (!authLoading) {
			if (!user) setAccessChecked(true);
			else
				checkDDetectorAccess(user.id)
					.then((ok) => {
						if (cancelled || currentIdentity.current !== identity) return;
						setHasAccess(ok);
						setAccessIdentity(identity);
						setAccessChecked(true);
						if (ok) document.title = "DDetector";
					})
					.catch(() => {
						if (cancelled || currentIdentity.current !== identity) return;
						setLoadError("Unable to check DDetector access");
						setAccessChecked(true);
					});
		}
		return () => {
			cancelled = true;
			generation.current++;
		};
	}, [authLoading, user?.id, identity]);

	useEffect(() => {
		if (!hasAccess || accessIdentity !== identity) return;
		let cancelled = false;
		setDataLoading(true);
		Promise.all([
			fetchDDetectorTracks(),
			fetchDDetectorLyrics(),
			fetchIgnoredTrackIds(),
		])
			.then(([t, l, ignored]) => {
				if (cancelled || currentIdentity.current !== identity) return;
				setTracks(t);
				setLyricsMap(l);
				setIgnoredIds(ignored);
			})
			.catch(() => {
				if (!cancelled && currentIdentity.current === identity)
					setLoadError("Unable to load DDetector data");
			})
			.finally(() => {
				if (!cancelled && currentIdentity.current === identity)
					setDataLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [hasAccess, accessIdentity, identity]);

	// Process tracks against lyrics
	useEffect(() => {
		if (!tracks.length) {
			setTrackStatus(new Map());
			setDrugCards([]);
			setProcessed(0);
			setFoundCount(0);
			return;
		}
		if (dataLoading) return;

		let cancelled = false;
		let yieldTimer: ReturnType<typeof setTimeout> | undefined;
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
					const annotated = lyrics.map((l) => ({
						ts: l.ts,
						...annotateDrugLine(l.text),
					}));
					const drugLines = annotated.filter((l) => l.isDrug);
					if (drugLines.length > 0) {
						status = "found";
						found++;
						const isUnsynced = lyrics.every((l) => l.ts === null);
						const card: DrugCard = { track, lines: drugLines };
						if (isUnsynced) {
							card.allLines = annotated;
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
					await new Promise<void>((r) => {
						yieldTimer = setTimeout(r, 0);
					});
				}
			}
		})();

		return () => {
			cancelled = true;
			clearTimeout(yieldTimer);
		};
	}, [tracks, lyricsMap, dataLoading]);

	// Toast helper
	const showToast = useCallback((msg: string) => {
		setToast(msg);
		setToastVisible(true);
		if (toastTimer.current) clearTimeout(toastTimer.current);
		toastTimer.current = setTimeout(() => setToastVisible(false), 3500);
	}, []);

	useEffect(
		() => () => {
			if (toastTimer.current) clearTimeout(toastTimer.current);
		},
		[],
	);

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
		if (
			!session?.access_token ||
			fetching ||
			!hasAccess ||
			accessIdentity !== identity
		)
			return;
		const owner = identity;
		const epoch = generation.current;
		const stale = () =>
			currentIdentity.current !== owner || generation.current !== epoch;
		setFetching(true);
		try {
			const result = await triggerDDetectorFetch(session.access_token);
			if (stale()) return;
			if (result.ok) {
				showToast(
					`Done: ${result.total} tracks, +${result.added} added, −${result.removed} removed, ${result.lyrics_fetched ?? 0} lyrics fetched`,
				);
				const [t, l] = await Promise.all([
					fetchDDetectorTracks(),
					fetchDDetectorLyrics(),
				]);
				if (stale()) return;
				setTracks(t);
				setLyricsMap(l);
			} else {
				showToast(`Error: ${result.error}`);
			}
		} catch (err) {
			if (!stale()) showToast(`Error: ${String(err)}`);
		} finally {
			if (!stale()) setFetching(false);
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

	if (
		authLoading ||
		!accessChecked ||
		(hasAccess && accessIdentity !== identity)
	) {
		return (
			<>
				<Header />
				<div className={styles.fullPageCenter}>
					<div className={styles.loadingDotsLayout}>
						<span />
						<span />
						<span />
					</div>
				</div>
				<Footer />
			</>
		);
	}

	if (loadError)
		return (
			<>
				<Header />
				<div className={styles.fullPageCenter} role="alert">
					{loadError}
				</div>
				<Footer />
			</>
		);

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
		<div className={styles.page}>
			{/* Header */}
			<div
				className={styles.headerLayout}
				onContextMenu={(e) => {
					e.preventDefault();
					setHeaderCtxMenu({ x: e.clientX, y: e.clientY });
				}}
			>
				<Link href="/" className={styles.headerTitleLayout}>
					D<span>Detector</span>
				</Link>
				<div className={styles.headerCount}>{filteredTracks.length} tracks</div>

				<div className={styles.headerControlsLayout}>
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

					<div className={styles.searchWrapLayout}>
						<input
							ref={searchInputRef}
							className={styles.searchInputLayout}
							type="text"
							placeholder="Search (Enter)"
							onKeyDown={(e) => {
								if (e.key === "Enter")
									setSearch(searchInputRef.current?.value ?? "");
							}}
						/>
					</div>

					<button
						className={styles.fetchBtnLayout}
						onClick={handleFetch}
						disabled={fetching || !session}
						title="Rebuild track list from external source"
					>
						{fetching ? (
							<svg
								className={styles.fetchSpinner}
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
				<div className={styles.loadingState}>Loading tracks...</div>
			) : (
				<div className={styles.panelsLayout}>
					{/* Left: track list */}
					<div className={styles.panelLeftLayout}>
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
						className={`${styles.panelRightLayout}${rightOpen ? ` ${styles.elementStyle}` : ""}`}
					>
						<button
							className={styles.panelToggleLayout}
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
								className={`${styles.toggleArrowLayout}${rightOpen ? ` ${styles.toggleArrowOpen}` : ""}`}
							>
								<polyline points="18 15 12 9 6 15" />
							</svg>
						</button>
						<div className={styles.rightHeaderLayout}>
							<span className={styles.statusLabel}>
								{processed < tracks.length
									? `Scanning ${processed} / ${tracks.length}`
									: tracks.length
										? `Done · ${tracks.length} tracks`
										: "No tracks"}
							</span>
							<div className={styles.progressWrap}>
								<div
									className={styles.progressBarLayout}
									style={{ width: `${progressPct}%` }}
								/>
							</div>
							{foundCount > 0 && (
								<span className={styles.foundLabel}>
									{foundCount} with hits
								</span>
							)}
						</div>

						<div className={styles.lyricsWrapLayout}>
							{drugCards.length === 0 && processed === tracks.length && (
								<div className={styles.emptyState}>
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
											className={`${styles.drugCardLayout}${isIgnored ? ` ${styles.drugCardIgnoredLayout}` : ""}`}
											ref={(el) => {
												if (el) cardRefs.current.set(track.id, el);
												else cardRefs.current.delete(track.id);
											}}
											onContextMenu={(e) =>
												handleCardContextMenu(e, track, !!allLines)
											}
										>
											<div className={styles.drugCardHeadLayout}>
												<div className={styles.drugCardCoverLayout}>
													{track.cover ? (
														<Image
															src={track.cover}
															alt=""
															width={40}
															height={40}
															loading="lazy"
														/>
													) : (
														<div className={styles.coverPh}>♪</div>
													)}
												</div>
												<div className={styles.trackInfo}>
													<div className={styles.drugCardTitle}>
														{track.title}
													</div>
													<div className={styles.drugCardArtist}>
														{track.artist}
													</div>
												</div>
												<div className={styles.drugCardActions}>
													{allLines && (
														<button
															className={`${styles.btnLayout} ${styles.btnCopyLayout}${isExpanded ? ` ${styles.btnExpandActiveLayout}` : ""}`}
															onClick={(e) => {
																e.stopPropagation();
																toggleExpanded(track.id);
															}}
														>
															{isExpanded ? "Collapse" : "Full lyrics"}
														</button>
													)}
													<button
														className={`${styles.btnLayout} ${styles.btnCopyLayout2}`}
														onClick={(e) => {
															e.stopPropagation();
															navigator.clipboard?.writeText(String(track.id));
															showToast(`ID copied: ${track.id}`);
														}}
													>
														Copy ID
													</button>
													<a
														className={`${styles.btnLayout} ${styles.btnYandexLayout}`}
														href={`https://yandex.ru/search/?text=${encodeURIComponent(`${track.title} ${track.artist} скачать mp3`)}`}
														target="_blank"
														rel="noopener noreferrer"
													>
														Yandex
													</a>
												</div>
											</div>

											<div
												className={`${styles.elementStyle2}${allLines ? ` ${styles.elementStyle3}` : ""}`}
											>
												{displayLines.map((line, li) => {
													const isContext =
														"isDrug" in line && line.isDrug === false;
													return (
														<div
															key={li}
															className={`${styles.drugLineLayout}${isContext ? ` ${styles.drugLineContextLayout}` : ""}`}
														>
															<span className={styles.drugTsLayout}>
																{line.ts ?? "—:——"}
															</span>
															<span className={styles.drugText}>
																{line.parts.map((part, index) =>
																	part.marked ? (
																		<mark key={index} className="drugMark">
																			{part.text}
																		</mark>
																	) : (
																		part.text
																	),
																)}
															</span>
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
					className={styles.ctxMenuLayout}
					style={{ top: ctxMenu.y, left: ctxMenu.x }}
				>
					<div className={styles.ctxMenuTrack}>
						<span className={styles.ctxMenuTitle}>{ctxMenu.track.title}</span>
						<span className={styles.ctxMenuArtist}>{ctxMenu.track.artist}</span>
					</div>
					<div className={styles.ctxMenuDivider} />
					<a
						className={styles.ctxMenuItemLayout}
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
						className={styles.ctxMenuItemLayout}
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
					<div className={styles.ctxMenuDivider} />
					{ctxMenu.hasAllLines && (
						<button
							className={styles.ctxMenuItemLayout}
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
						className={`${styles.ctxMenuItemLayout} ${ignoredIds.has(ctxMenu.track.id) ? styles.ctxMenuItemUnignoreLayout : styles.ctxMenuItemIgnoreLayout}`}
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
					className={styles.ctxMenuLayout}
					style={{ top: headerCtxMenu.y, left: headerCtxMenu.x }}
				>
					<button
						className={styles.ctxMenuItemLayout}
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
				className={`${styles.toastLayout}${toastVisible ? ` ${styles.elementStyle4}` : ""}`}
			>
				{toast}
			</div>
		</div>
	);
}
