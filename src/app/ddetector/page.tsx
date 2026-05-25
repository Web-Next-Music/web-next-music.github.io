"use client";

import {
	useState,
	useEffect,
	useRef,
	useCallback,
	useMemo,
	memo,
	startTransition,
} from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import notFoundStyles from "../not-found.module.scss";
import {
	checkDDetectorAccess,
	fetchDDetectorTracks,
	fetchDDetectorLyrics,
	triggerDDetectorFetch,
	type DDetectorTrack,
	type LyricLine,
} from "@/lib/ddetector";
import styles from "./page.module.scss";

// Drug detection
const DRUG_KEYWORDS = [
	"наркотик",
	"наркотики",
	"наркота",
	"наркоман",
	"наркомания",
	"героин",
	"кокаин",
	"кокс",
	"марихуана",
	"гашиш",
	"анаша",
	"опиум",
	"опиаты",
	"амфетамин",
	"метамфетамин",
	"метамф",
	"экстази",
	"мдма",
	"лсд",
	"спайс",
	"мефедрон",
	"кетамин",
	"хмур",
	"хмурый",
	"хмурого",
	"хмурым",
	"трава",
	"дурь",
	"дурман",
	"порошок",
	"дорожка",
	"кристалл",
	"кристаллы",
	"колёса",
	"колёс",
	"таблы",
	"соль",
	"меф",
	"скорость",
	"ширяться",
	"ширнуться",
	"укол",
	"доза",
	"дозу",
	"передоз",
	"ломка",
	"торчать",
	"торчок",
	"торчала",
	"торчал",
	"барыга",
	"дилер",
	"нарк",
	"закинуться",
	"вмазаться",
	"накуриться",
	"обкуриться",
	"обдолбаться",
	"пыхнуть",
	"пыхаем",
	"косяк",
	"джойнт",
	"дымить",
	"дозняк",
	"drug",
	"drugs",
	"heroin",
	"cocaine",
	"coke",
	"meth",
	"marijuana",
	"weed",
	"crack",
	"xanax",
	"xan",
	"fentanyl",
	"fent",
	"codeine",
	"lean",
	"molly",
	"mdma",
	"ecstasy",
	"acid",
	"lsd",
	"shroom",
	"shrooms",
	"mushroom",
	"mushrooms",
	"percocet",
	"perc",
	"percs",
	"oxy",
	"oxycodone",
	"adderall",
	"amphetamine",
	"speed",
	"ketamine",
	"overdose",
	"od",
	"needle",
	"dealer",
	"plug",
	"dope",
	"stash",
	"blunt",
	"joint",
	"bong",
	"ganja",
	"chronic",
	"promethazine",
	"syrup",
	"drank",
	"roll",
	"rolled",
	"rolling",
	"junkie",
	"junky",
	"fiend",
	"trap",
	"trapping",
	"sack",
	"re-up",
	"reup",
];
// Build a single regex from all keywords (longer first to prevent partial shadowing)
const _DRUG_ALT = [...DRUG_KEYWORDS]
	.sort((a, b) => b.length - a.length)
	.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
	.join("|");
const _W = "[\\wа-яёА-ЯЁ]"; // word-character class including Cyrillic

// Detect: keyword must stand alone (not surrounded by word chars on both sides)
const DRUG_DETECT_RE = new RegExp(`(?<!${_W})(${_DRUG_ALT})(?!${_W})`, "i");
// Highlight: match the full word that contains any drug keyword
const DRUG_HIGHLIGHT_RE = new RegExp(
	`(?<!${_W})${_W}*(?:${_DRUG_ALT})${_W}*(?!${_W})`,
	"gi",
);
const MARK =
	'<mark style="background:rgba(43,254,245,0.12);color:var(--accent);border-radius:3px;padding:0 3px;font-weight:600">$&</mark>';

function hasDrugWord(text: string): boolean {
	DRUG_DETECT_RE.lastIndex = 0;
	return DRUG_DETECT_RE.test(text);
}

function escHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function highlightDrugs(rawText: string): string {
	return escHtml(rawText).replace(DRUG_HIGHLIGHT_RE, MARK);
}

// 404
function NotFoundView() {
	return (
		<main className={notFoundStyles.main}>
			<div className={notFoundStyles.wave} aria-hidden>
				{Array.from({ length: 32 }).map((_, i) => (
					<div
						key={i}
						className={notFoundStyles.bar}
						style={
							{
								"--h": `${20 + Math.abs(Math.sin(i * 0.7) * 60)}%`,
								"--delay": `${i * 0.05}s`,
							} as React.CSSProperties
						}
					/>
				))}
			</div>
			<div className={notFoundStyles.content}>
				<div className={notFoundStyles.code}>404</div>
				<h1 className={notFoundStyles.title}>Page not found</h1>
				<p className={notFoundStyles.desc}>
					It looks like this page has been deleted or never existed
				</p>
				<div className={notFoundStyles.actions}>
					<Link href="/" className={notFoundStyles.btnPrimary}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
							<path
								d="M19 12H5M5 12l7-7M5 12l7 7"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						To the homepage
					</Link>
				</div>
			</div>
		</main>
	);
}

// Track badge
type TrackStatus = "pending" | "found" | "none" | "error";

const BADGE_CFG: Record<TrackStatus, { cls: string; label: string }> = {
	pending: { cls: styles.badgePending, label: "…" },
	found: { cls: styles.badgeFound, label: "found" },
	none: { cls: styles.badgeNone, label: "clean" },
	error: { cls: styles.badgeError, label: "no lyrics" },
};

interface DrugCard {
	track: DDetectorTrack;
	lines: Array<{ ts: string | null; html: string }>;
	allLines?: Array<{ ts: string | null; html: string; isDrug: boolean }>;
}

function handleCoverError(e: React.SyntheticEvent<HTMLImageElement>) {
	(e.currentTarget.parentNode as HTMLElement).innerHTML =
		`<div class="${styles.coverPh}">♪</div>`;
}

interface TrackRowProps {
	track: DDetectorTrack;
	index: number;
	status: TrackStatus;
	date: string | undefined;
	isActive: boolean;
	onClick: (track: DDetectorTrack) => void;
}

const TrackRow = memo(function TrackRow({
	track,
	index,
	status,
	date,
	isActive,
	onClick,
}: TrackRowProps) {
	const badge = BADGE_CFG[status];
	return (
		<div
			className={`${styles.track}${isActive ? ` ${styles.trackActive}` : ""}`}
			onClick={() => onClick(track)}
		>
			<span className={styles.trackNum}>{index + 1}</span>
			<div className={styles.cover}>
				{track.cover ? (
					<img
						src={track.cover}
						alt=""
						loading="lazy"
						onError={handleCoverError}
					/>
				) : (
					<div className={styles.coverPh}>♪</div>
				)}
			</div>
			<div className={styles.trackInfo}>
				<div className={styles.trackTitle}>{track.title}</div>
				<div className={styles.trackArtist}>
					{track.artist && <span>{track.artist}</span>}
				</div>
			</div>
			<a
				className={styles.trackYandex}
				href={`https://yandex.ru/search/?text=${encodeURIComponent(`${track.title} ${track.artist} скачать mp3`)}`}
				target="_blank"
				rel="noopener noreferrer"
				onClick={(e) => e.stopPropagation()}
				title="Search on Yandex"
			>
				Y
			</a>
			{date && <span className={styles.trackDateBadge}>{date}</span>}
			<span className={`${styles.badge} ${badge.cls}`}>{badge.label}</span>
		</div>
	);
});

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
	const processing = useRef(false);

	// Search & sort
	const searchInputRef = useRef<HTMLInputElement>(null);
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<"default" | "date" | "alpha">("default");
	const [sortOpen, setSortOpen] = useState(false);
	const sortRef = useRef<HTMLDivElement>(null);

	// Fetch button
	const [fetching, setFetching] = useState(false);

	// Toast
	const [toast, setToast] = useState("");
	const [toastVisible, setToastVisible] = useState(false);
	const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Active track
	const [activeId, setActiveId] = useState<number | null>(null);
	const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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

	// Close sort dropdown on outside click
	useEffect(() => {
		if (!sortOpen) return;
		const handler = (e: MouseEvent) => {
			if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [sortOpen]);

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
		Promise.all([fetchDDetectorTracks(), fetchDDetectorLyrics()])
			.then(([t, l]) => {
				setTracks(t);
				setLyricsMap(l);
				setTrackStatus(new Map(t.map((tr) => [tr.id, "pending"])));
			})
			.catch((e) => console.error("DDetector data load:", e))
			.finally(() => setDataLoading(false));
	}, [hasAccess]);

	// Process tracks against lyrics
	useEffect(() => {
		if (!tracks.length || dataLoading || processing.current) return;
		processing.current = true;
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
			processing.current = false;
		})();
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
			cardRefs.current
				.get(track.id)
				?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
				setTrackStatus(new Map(t.map((tr) => [tr.id, "pending"])));
				processing.current = false;
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
		if (sort === "date") {
			list = [...list].sort((a, b) => {
				const da = a.added_at ? new Date(a.added_at).getTime() : 0;
				const db = b.added_at ? new Date(b.added_at).getTime() : 0;
				return db - da;
			});
		} else if (sort === "alpha") {
			list = [...list].sort((a, b) => a.title.localeCompare(b.title));
		}
		return list;
	}, [tracks, search, sort]);

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

	const SORT_LABELS: Record<typeof sort, string> = {
		default: "Default",
		date: "By date",
		alpha: "A - Z",
	};

	const progressPct = tracks.length ? (processed / tracks.length) * 100 : 0;

	// Render states

	if (authLoading || !accessChecked) {
		return (
			<>
				<Header />
				<div className={styles.fullPageCenter}>
					<div className={styles.loadingDots}>
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
		<div className={styles.page}>
			{/* Header */}
			<div className={styles.header}>
				<Link href="/" className={styles.headerTitle}>
					D<span>Detector</span>
				</Link>
				<div className={styles.headerCount}>{filteredTracks.length} tracks</div>

				<div className={styles.headerControls}>
					<div ref={sortRef} className={styles.sortWrap}>
						<button
							className={styles.sortBtn}
							onClick={() => setSortOpen((v) => !v)}
						>
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<line x1="8" y1="6" x2="21" y2="6" />
								<line x1="8" y1="12" x2="21" y2="12" />
								<line x1="8" y1="18" x2="21" y2="18" />
								<line x1="3" y1="6" x2="3.01" y2="6" />
								<line x1="3" y1="12" x2="3.01" y2="12" />
								<line x1="3" y1="18" x2="3.01" y2="18" />
							</svg>
							{SORT_LABELS[sort]}
						</button>
						{sortOpen && (
							<div className={styles.sortDropdown}>
								{(["default", "date", "alpha"] as const).map((opt) => (
									<button
										key={opt}
										className={`${styles.sortOption}${sort === opt ? ` ${styles.sortOptionActive}` : ""}`}
										onClick={() => {
											setSort(opt);
											setSortOpen(false);
										}}
									>
										{SORT_LABELS[opt]}
									</button>
								))}
							</div>
						)}
					</div>

					<div className={styles.searchWrap}>
						<input
							ref={searchInputRef}
							className={styles.searchInput}
							type="text"
							placeholder="Search (Enter)"
							onKeyDown={(e) => {
								if (e.key === "Enter")
									setSearch(searchInputRef.current?.value ?? "");
							}}
						/>
					</div>

					<button
						className={styles.fetchBtn}
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
				<div className={styles.panels}>
					{/* Left: track list */}
					<div className={styles.panelLeft}>
						{filteredTracks.map((track, i) => (
							<TrackRow
								key={track.id}
								track={track}
								index={i}
								status={trackStatus.get(track.id) ?? "pending"}
								date={trackDates.get(track.id)}
								isActive={activeId === track.id}
								onClick={handleTrackClick}
							/>
						))}
					</div>

					{/* Right: drug cards */}
					<div className={styles.panelRight}>
						<div className={styles.rightHeader}>
							<span className={styles.statusLabel}>
								{processed < tracks.length
									? `Scanning ${processed} / ${tracks.length}`
									: tracks.length
										? `Done · ${tracks.length} tracks`
										: "No tracks"}
							</span>
							<div className={styles.progressWrap}>
								<div
									className={styles.progressBar}
									style={{ width: `${progressPct}%` }}
								/>
							</div>
							{foundCount > 0 && (
								<span className={styles.foundLabel}>
									{foundCount} with hits
								</span>
							)}
						</div>

						<div className={styles.lyricsWrap}>
							{drugCards.length === 0 && processed === tracks.length && (
								<div className={styles.emptyState}>
									{tracks.length
										? "No drug references found"
										: "No tracks. Press Fetch to load."}
								</div>
							)}

							{drugCards.map(({ track, lines, allLines }) => {
								const isExpanded = expandedCards.has(track.id);
								const displayLines = isExpanded && allLines ? allLines : lines;
								return (
									<div
										key={track.id}
										className={styles.drugCard}
										ref={(el) => {
											if (el) cardRefs.current.set(track.id, el);
											else cardRefs.current.delete(track.id);
										}}
									>
										<div className={styles.drugCardHead}>
											<div className={styles.drugCardCover}>
												{track.cover ? (
													<img src={track.cover} alt="" loading="lazy" />
												) : (
													<div className={styles.coverPh}>♪</div>
												)}
											</div>
											<div className={styles.drugCardInfo}>
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
														className={`${styles.btn} ${styles.btnExpand}${isExpanded ? ` ${styles.btnExpandActive}` : ""}`}
														onClick={(e) => {
															e.stopPropagation();
															toggleExpanded(track.id);
														}}
													>
														{isExpanded ? "Collapse" : "Full lyrics"}
													</button>
												)}
												<button
													className={`${styles.btn} ${styles.btnCopy}`}
													onClick={(e) => {
														e.stopPropagation();
														navigator.clipboard?.writeText(String(track.id));
														showToast(`ID copied: ${track.id}`);
													}}
												>
													Copy ID
												</button>
												<a
													className={`${styles.btn} ${styles.btnYandex}`}
													href={`https://yandex.ru/search/?text=${encodeURIComponent(`${track.title} ${track.artist} скачать mp3`)}`}
													target="_blank"
													rel="noopener noreferrer"
												>
													Yandex
												</a>
											</div>
										</div>

										<div
											className={`${styles.drugLines}${allLines ? ` ${styles.drugLinesNoTs}` : ""}`}
										>
											{displayLines.map((line, li) => {
												const isContext =
													"isDrug" in line && line.isDrug === false;
												return (
													<div
														key={li}
														className={`${styles.drugLine}${isContext ? ` ${styles.drugLineContext}` : ""}`}
													>
														<span className={styles.drugTs}>
															{line.ts ?? "—:——"}
														</span>
														<span
															className={styles.drugText}
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

			{/* Toast */}
			<div
				className={`${styles.toast}${toastVisible ? ` ${styles.toastShow}` : ""}`}
			>
				{toast}
			</div>
		</div>
	);
}
