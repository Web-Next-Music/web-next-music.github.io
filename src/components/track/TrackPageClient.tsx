"use client";

import {
	useEffect,
	useLayoutEffect,
	useState,
	useRef,
	useCallback,
	Suspense,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import LikeButton from "@/components/common/LikeButton";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { usePlayer } from "@/lib/miniplayer";
import {
	ensureTracksLoaded,
	subscribeStore,
	getStoreSnapshot,
	findTrackById,
	type CachedTrack,
} from "@/lib/track/trackStore";
import {
	decodeTrackKey,
	encodeTrackKey,
	stableTrackKey,
} from "@/lib/track/trackKey";
import styles from "./TrackPageClient.module.scss";
import { ID3Writer } from "browser-id3-writer";
import {
	ArrowLeft as ArrowLeftIcon,
	Music as MusicNoteIcon,
	Pause as PauseIcon,
	Play as PlayIcon,
	Info as InfoCircleIcon,
	Download as DownloadTrackIcon,
	Clipboard as ClipboardIcon,
	ExternalLink as ExternalLinkIcon,
	Clock as ClockIcon,
} from "lucide-react";

interface LrcLine {
	time: number;
	text: string;
}

function parseLrc(raw: string): LrcLine[] {
	const lines: LrcLine[] = [];
	const re = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
	for (const line of raw.split("\n")) {
		const m = line.match(re);
		if (!m) continue;
		const min = parseInt(m[1], 10);
		const sec = parseInt(m[2], 10);
		const ms = parseInt(m[3].padEnd(3, "0"), 10);
		const time = min * 60 + sec + ms / 1000;
		const text = m[4].trim();
		if (text) lines.push({ time, text });
	}
	return lines;
}

interface LrcResult {
	synced: LrcLine[] | null;
	plain: string | null;
	found: boolean;
}

async function fetchLyrics(title: string, artist: string): Promise<LrcResult> {
	const empty: LrcResult = { synced: null, plain: null, found: false };

	const parse = (data: any): LrcResult | null => {
		if (!data || data.statusCode === 404) return null;
		const synced = data.syncedLyrics ? parseLrc(data.syncedLyrics) : null;
		const plain = data.plainLyrics ?? null;
		if (!synced && !plain) return null;
		return { synced, plain, found: true };
	};

	try {
		const q = new URLSearchParams({
			track_name: title,
			artist_name: artist,
		});
		const fast = await fetch(`https://lrclib.net/api/get?${q}`);
		if (fast.ok) {
			const result = parse(await fast.json());
			if (result) return result;
		}

		const search = await fetch(`https://lrclib.net/api/search?${q}`);
		if (!search.ok) return empty;
		const list = await search.json();
		if (!list?.length) return empty;
		const best = list.find((d: any) => d.syncedLyrics) ?? list[0];
		const result = parse(best);
		return result ?? empty;
	} catch {
		return empty;
	}
}

function downloadDirect(audioUrl: string) {
	window.open(audioUrl, "_blank");
}

async function handleDownload(
	audioUrl: string,
	artist: string,
	title: string,
	cover?: string,
) {
	const audioRes = await fetch(
		`https://proxy.nm.diram1x.ru/?url=${encodeURIComponent(audioUrl)}`,
	);
	const arrayBuffer = await audioRes.arrayBuffer();

	const writer = new ID3Writer(arrayBuffer);

	if (cover) {
		const coverRes = await fetch(cover);
		const coverBuffer = await coverRes.arrayBuffer();

		writer.setFrame("APIC", {
			type: 3,
			data: coverBuffer,
			description: "Cover",
		});
	}

	writer.setFrame("TIT2", title);
	writer.setFrame("TPE1", [artist]);

	writer.addTag();

	const blob = writer.getBlob();

	const objectUrl = URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = objectUrl;
	a.download = `${artist} - ${title}.mp3`;
	a.click();

	URL.revokeObjectURL(objectUrl);
}

function TrackPageContent({
	isHiddenMode,
	idOverride,
}: {
	isHiddenMode: boolean;
	idOverride?: string;
}) {
	const searchParams = useSearchParams();
	const pathname = usePathname();

	const resolvedId =
		idOverride ??
		searchParams.get("id") ??
		pathname?.match(/^\/track\/([^/]+)\/?$/)?.[1] ??
		"";
	const [id, setId] = useState(resolvedId);
	const hasOtherSource = !!(searchParams.get("key") || searchParams.get("url"));
	useEffect(() => {
		if (resolvedId) {
			if (resolvedId !== id) setId(resolvedId);
		} else if (hasOtherSource && id) {
			setId("");
		}
	}, [resolvedId, hasOtherSource, id]);

	// Single encoded key. A "-e" suffix marks exclusive (no-download) mode.
	const rawKey = searchParams.get("key") ?? "";
	const isExclusive = rawKey.endsWith("-e");
	const keyParam = isExclusive ? rawKey.slice(0, -2) : rawKey;
	const keyData = keyParam ? decodeTrackKey(keyParam) : null;

	const directUrl = keyData?.url ?? searchParams.get("url") ?? "";
	const paramCover = keyData?.cover ?? searchParams.get("cover") ?? undefined;
	const paramArtist =
		keyData?.artist ?? searchParams.get("artist") ?? "Unknown Artist";
	const paramTitle =
		keyData?.title ?? searchParams.get("title") ?? "Unknown Title";
	const paramToken = keyData?.token ?? searchParams.get("token") ?? "";

	const router = useRouter();

	useLayoutEffect(() => {
		if (typeof window === "undefined") return;
		if (!id || idOverride || rawKey || directUrl) return;
		if (window.location.pathname !== "/track") return;
		window.history.replaceState(null, "", `/track/${id}`);
	}, [id, idOverride, rawKey, directUrl]);

	const [storeReady, setStoreReady] = useState(() => getStoreSnapshot().loaded);
	const [track, setTrack] = useState<CachedTrack | null>(null);

	// Create virtual track for direct URL mode
	const urlTrack =
		directUrl && !id
			? {
					id: "",
					url: directUrl,
					title: paramTitle ?? "Unknown",
					artist: paramArtist ?? "",
					cover: paramCover ?? undefined,
					yandexUrl: "",
				}
			: null;

	// Use store track or virtual URL track
	const displayTrack = track ?? urlTrack;
	const [notFound, setNotFound] = useState(false);

	const [lyrics, setLyrics] = useState<LrcResult | null>(null);
	const [lyricsLoading, setLyricsLoading] = useState(false);
	const [showLyrics, setShowLyrics] = useState(true);

	const player = usePlayer();
	const [activeLine, setActiveLine] = useState(-1);

	const [ugcState, setUgcState] = useState<
		"idle" | "loading" | "playing" | "error"
	>("idle");

	const [exclusiveBlobUrl, setExclusiveBlobUrl] = useState<string | null>(null);
	const [exclusiveLoading, setExclusiveLoading] = useState(false);
	const blobUrlRef = useRef<string | null>(null);

	const [showDownloadError, setShowDownloadError] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [copyKeyFeedback, setCopyKeyFeedback] = useState<"idle" | "copied">(
		"idle",
	);

	const lyricsContainerRef = useRef<HTMLDivElement>(null);
	const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
	const userScrolling = useRef(false);
	const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const handler = () => setShowLyrics((v) => !v);
		window.addEventListener("toggleLyrics", handler);
		return () => window.removeEventListener("toggleLyrics", handler);
	}, []);

	useEffect(() => {
		if (getStoreSnapshot().loaded) {
			setStoreReady(true);
			return;
		}
		const unsub = subscribeStore(() => {
			if (getStoreSnapshot().loaded) {
				setStoreReady(true);
				unsub();
			}
		});
		ensureTracksLoaded();
		return unsub;
	}, []);

	useEffect(() => {
		if (!storeReady) return;
		// Only check for notFound when using id (not for url mode)
		if (!id && !directUrl) {
			setNotFound(true);
			return;
		}
		if (id) {
			const found = findTrackById(id);
			found ? setTrack(found) : setNotFound(true);
		}
		// For url mode, displayTrack will be used from the virtual track
	}, [storeReady, id, directUrl]);

	const playedRef = useRef(false);

	const getExclusivePlaybackUrl = useCallback(async () => {
		if (!isExclusive) return directUrl;
		if (blobUrlRef.current) return blobUrlRef.current;

		setExclusiveLoading(true);
		try {
			const res = await fetch(
				`https://proxy.nm.diram1x.ru/?url=${encodeURIComponent(directUrl)}`,
			);
			if (!res.ok) throw new Error("Failed to load exclusive audio");
			const blob = await res.blob();
			const objectUrl = URL.createObjectURL(blob);
			blobUrlRef.current = objectUrl;
			setExclusiveBlobUrl(objectUrl);
			return objectUrl;
		} finally {
			setExclusiveLoading(false);
		}
	}, [directUrl, isExclusive]);

	useEffect(() => {
		return () => {
			if (blobUrlRef.current) {
				URL.revokeObjectURL(blobUrlRef.current);
				blobUrlRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (!directUrl || !player || playedRef.current) return;
		playedRef.current = true;

		try {
			const host = new URL(directUrl).hostname;
			if (!host.endsWith("yandex.net")) {
				setUgcState("error");
				return;
			}
		} catch {
			setUgcState("error");
			return;
		}

		setUgcState("playing");
	}, [player, directUrl, paramTitle, paramArtist, paramCover]);

	useEffect(() => {
		if (!displayTrack?.title) return;
		setLyrics(null);
		setLyricsLoading(true);
		setShowLyrics(true);
		setActiveLine(-1);
		if (lyricsContainerRef.current) {
			lyricsContainerRef.current.scrollTop = 0;
		}
		fetchLyrics(displayTrack?.title, displayTrack?.artist).then((res) => {
			setLyrics(res);
			setLyricsLoading(false);
			if (!res.found) setShowLyrics(false);
		});
	}, [displayTrack?.title, displayTrack?.artist]);

	const isThisLoaded = id
		? player?.nowPlaying?.id === id
		: isExclusive
			? player?.nowPlaying?.id === rawKey ||
				player?.nowPlaying?.url === exclusiveBlobUrl
			: player?.nowPlaying?.url === directUrl;

	useEffect(() => {
		if (!lyrics?.synced) return;
		if (!isThisLoaded) {
			setActiveLine(-1);
			return;
		}

		const lines = lyrics.synced;
		let rafId: number;
		let lastIdx = -1;

		const tick = () => {
			const audio = player?.audioRef.current;
			const t = audio?.currentTime ?? 0;

			let idx = -1;
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].time <= t) idx = i;
			}

			if (idx !== lastIdx) {
				lastIdx = idx;
				setActiveLine(idx);
			}

			rafId = requestAnimationFrame(tick);
		};

		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	}, [lyrics?.synced, isThisLoaded, player?.audioRef]);

	useEffect(() => {
		if (!isThisLoaded) {
			setActiveLine(-1);
		}
	}, [isThisLoaded]);

	useEffect(() => {
		if (activeLine < 0 || userScrolling.current) return;
		const container = lyricsContainerRef.current;
		const el = lineRefs.current[activeLine];
		if (!container || !el) return;

		const containerRect = container.getBoundingClientRect();
		const elRect = el.getBoundingClientRect();
		const elOffsetInContainer =
			elRect.top - containerRect.top + container.scrollTop;

		if (activeLine === 0) {
			container.scrollTo({ top: 0, behavior: "smooth" });
		} else {
			const targetScrollTop =
				elOffsetInContainer - container.clientHeight / 2 + el.clientHeight / 2;
			container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
		}
	}, [activeLine]);

	const handleLyricsScroll = useCallback(() => {
		userScrolling.current = true;
		if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
		scrollTimeout.current = setTimeout(() => {
			userScrolling.current = false;
		}, 3000);
	}, []);

	const handlePlay = useCallback(async () => {
		if (!displayTrack || !player) return;
		let playbackUrl = displayTrack.url;
		if (isExclusive) {
			try {
				playbackUrl = await getExclusivePlaybackUrl();
			} catch (error) {
				console.error("Failed to prepare playback:", error);
				setUgcState("error");
				return;
			}
		}

		player.play({
			id: isExclusive ? rawKey : displayTrack.id,
			url: playbackUrl,
			directUrl: directUrl && !isExclusive ? displayTrack.url : undefined,
			title: displayTrack.title,
			artist: displayTrack.artist,
			cover: displayTrack.cover,
			yandexUrl: displayTrack.yandexUrl,
		});
	}, [
		displayTrack,
		player,
		getExclusivePlaybackUrl,
		isExclusive,
		rawKey,
		directUrl,
	]);

	const handleCopyKey = useCallback(async () => {
		if (!displayTrack) return;
		const key = encodeTrackKey({
			url: displayTrack.url,
			title: displayTrack.title,
			artist: displayTrack.artist,
			cover: displayTrack.cover,
			token: paramToken || undefined,
		});
		const copiedKey = isExclusive ? `${key}-e` : key;
		try {
			await navigator.clipboard.writeText(copiedKey);
			setCopyKeyFeedback("copied");
			setTimeout(() => setCopyKeyFeedback("idle"), 2000);
		} catch (error) {
			console.error("Failed to copy key:", error);
		}
	}, [displayTrack, isExclusive, paramToken]);

	useEffect(() => {
		window.dispatchEvent(
			new CustomEvent("lyricsState", { detail: { open: showLyrics } }),
		);
	}, [showLyrics]);

	const isThisPlaying = isThisLoaded && player?.isPlaying;

	// No fallback needed - displayTrack handles all cases

	if (!storeReady) {
		return (
			<div className={styles.centered}>
				<div className={styles.loadingDots}>
					<span />
					<span />
					<span />
				</div>
				<p className={styles.centeredDesc}>Loading track…</p>
			</div>
		);
	}

	if (notFound) {
		return (
			<div className={styles.centered}>
				<div className={styles.notFoundIcon}>
					<InfoCircleIcon width={48} height={48} />
				</div>
				<h2 className={styles.centeredTitle}>Track not found</h2>
				<p className={styles.centeredDesc}>
					{id ? `Track with ID ${id} was not found` : "Track not found"}
				</p>
				<button className={styles.backBtn} onClick={() => router.back()}>
					Back
				</button>
			</div>
		);
	}

	if (!displayTrack) {
		return (
			<div className={styles.centered}>
				<div className={styles.loadingDots}>
					<span />
					<span />
					<span />
				</div>
			</div>
		);
	}

	const hasLyrics = lyrics?.found;
	const isSynced = !!lyrics?.synced;
	const directTrackId = isExclusive
		? rawKey
		: stableTrackKey(directUrl, paramTitle, paramArtist, paramCover);

	return (
		<div className={styles.page}>
			<div
				className={`${styles.layoutOuter} ${!showLyrics ? styles.layoutOuterCentered : ""}`}
			>
				<button
					className={styles.backLink}
					onClick={() => router.back()}
					style={{
						display: isHiddenMode ? "none" : "auto",
					}}
				>
					<ArrowLeftIcon />
				</button>
				<div
					className={`${styles.layout} ${!showLyrics ? styles.layoutCentered : ""}`}
				>
					<div className={styles.heroCard}>
						<div className={styles.coverWrap}>
							{displayTrack?.cover ? (
								<img
									src={displayTrack?.cover}
									alt={displayTrack?.title}
									className={styles.heroCover}
								/>
							) : (
								<div className={styles.heroCoverPlaceholder}>
									<MusicNoteIcon width={48} height={48} />
								</div>
							)}

							<button
								className={styles.coverPlayBtn}
								onClick={
									isThisPlaying
										? player?.pause
										: isThisLoaded
											? player?.resume
											: handlePlay
								}
								disabled={exclusiveLoading}
								aria-label={isThisPlaying ? "Pause" : "Play"}
							>
								{exclusiveLoading ? (
									<div className={styles.miniDots}>
										<span />
										<span />
										<span />
									</div>
								) : isThisPlaying ? (
									<PauseIcon width={28} height={28} />
								) : (
									<PlayIcon width={28} height={28} />
								)}
							</button>

							{isThisPlaying && (
								<div className={styles.playingBadge}>
									<span />
									<span />
									<span />
								</div>
							)}
						</div>

						<div className={styles.heroMeta}>
							<div className={styles.heroInfoRow}>
								<div>
									<div className={styles.heroTitleRow}>
										<h1 className={styles.heroTitle}>{displayTrack?.title}</h1>
									</div>
									<p className={styles.heroArtist}>
										{displayTrack?.artist || "Unknown artist"}
									</p>
								</div>
								{(displayTrack?.id || directUrl) && (
									<LikeButton
										compact
										className={styles.trackLikeBtn}
										target={{
											type: "track",
											trackId: displayTrack?.id || directTrackId,
											meta:
												!displayTrack?.id && directUrl
													? {
															title: displayTrack?.title,
															artist: displayTrack?.artist,
															cover: displayTrack?.cover,
															mp3_url: isExclusive ? undefined : directUrl,
														}
													: undefined,
										}}
									/>
								)}
							</div>
							{displayTrack?.id && (
								<p className={styles.heroId}>ID: {displayTrack?.id}</p>
							)}
						</div>

						<div className={styles.heroActions}>
							{directUrl && !id && !isExclusive && (
								<button
									onClick={async () => {
										setIsDownloading(true);
										try {
											await handleDownload(
												directUrl,
												paramArtist,
												paramTitle,
												paramCover,
											);
										} catch (error) {
											setShowDownloadError(true);
										} finally {
											setIsDownloading(false);
										}
									}}
									disabled={isDownloading}
									className={styles.outlineBtn}
								>
									<DownloadTrackIcon size={15} />
									{isDownloading ? "Downloading..." : "Download"}
								</button>
							)}

							{directUrl && !id && (
								<button onClick={handleCopyKey} className={styles.outlineBtn}>
									<ClipboardIcon size={15} />
									{copyKeyFeedback === "copied" ? "Copied!" : "Copy key"}
								</button>
							)}

							{displayTrack?.yandexUrl && (
								<a
									href={displayTrack?.yandexUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={styles.outlineBtn}
								>
									<ExternalLinkIcon size={14} />
									Yandex Music
								</a>
							)}

							{lyricsLoading}

							{lyrics !== null && !hasLyrics && !lyricsLoading}
						</div>
					</div>

					{showLyrics && (
						<div className={styles.lyricsPanel}>
							<div className={styles.lyricsMeta}>
								<span className={styles.lyricsLabel}>
									{lyricsLoading ? (
										<>
											<span className={styles.miniDots}>
												<span />
												<span />
												<span />
											</span>
											Searching…
										</>
									) : isSynced ? (
										<>
											<ClockIcon size={11} color="var(--accent)" />
											Synchronized
										</>
									) : hasLyrics ? (
										"Plain lyrics"
									) : (
										"No lyrics found"
									)}
								</span>
								{hasLyrics && !lyricsLoading && (
									<a
										href="https://lrclib.net/"
										target="_blank"
										rel="noopener noreferrer"
										className={styles.lyricsSource}
									>
										via lrclib.net
									</a>
								)}
							</div>

							{lyricsLoading && (
								<div className={styles.lyricsSkeleton}>
									{[80, 55, 90, 45, 70, 60, 85, 50, 75, 40].map((w, i) => (
										<div
											key={i}
											className={styles.skeletonLine}
											style={{
												width: `${w}%`,
												animationDelay: `${i * 0.05}s`,
											}}
										/>
									))}
								</div>
							)}

							{!lyricsLoading && isSynced && (
								<div
									className={styles.syncedLyrics}
									ref={lyricsContainerRef}
									onScroll={handleLyricsScroll}
								>
									{lyrics!.synced!.map((line, i) => (
										<div
											key={i}
											ref={(el) => {
												lineRefs.current[i] = el;
											}}
											className={[
												styles.lyricLine,
												i === activeLine ? styles.lyricLineActive : "",
												i < activeLine ? styles.lyricLinePast : "",
											].join(" ")}
											onClick={() => {
												const audio = player?.audioRef.current;
												if (!isThisLoaded) {
													handlePlay();
													const trySeek = () => {
														const a = player?.audioRef.current;
														if (a && a.readyState >= 1) {
															a.currentTime = line.time;
															a.play().catch(console.error);
														} else {
															setTimeout(trySeek, 50);
														}
													};
													setTimeout(trySeek, 50);
													return;
												}
												if (!audio) return;
												audio.currentTime = line.time;
												if (!player?.isPlaying) player?.resume();
											}}
										>
											<span className={styles.lyricText}>{line.text}</span>
										</div>
									))}
									<div className={styles.lyricsBottomPad} />
								</div>
							)}

							{!lyricsLoading && !isSynced && hasLyrics && (
								<div className={styles.plainLyrics}>
									{lyrics!.plain!.split("\n").map((line, i) => (
										<p
											key={i}
											className={styles.plainLine}
											style={{
												animationDelay: `${Math.min(i * 0.02, 0.5)}s`,
											}}
										>
											{line || <br />}
										</p>
									))}
								</div>
							)}

							{!lyricsLoading && lyrics !== null && !hasLyrics && (
								<div className={styles.noLyricsBody}>
									<p>No lyrics found for this track.</p>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
			<Modal
				open={showDownloadError}
				onClose={() => setShowDownloadError(false)}
				size="sm"
				title="Download Error"
				footer={
					<>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => setShowDownloadError(false)}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							disabled={isDownloading}
							onClick={() => {
								downloadDirect(directUrl);
								setShowDownloadError(false);
							}}
						>
							Download without metadata
						</Button>
					</>
				}
			>
				Failed to download track with metadata. Would you like to download the
				track directly without metadata instead?
			</Modal>
		</div>
	);
}

export default function TrackPage({
	idOverride,
}: { idOverride?: string } = {}) {
	const searchParams = useSearchParams();
	// Token can come from the encoded key OR as a plain ?token= param (old clients)
	const keyToken = (() => {
		const k = searchParams.get("key");
		if (!k) return "";
		const keyParam = k.endsWith("-e") ? k.slice(0, -2) : k;
		return decodeTrackKey(keyParam)?.token ?? "";
	})();
	const paramToken = keyToken || searchParams.get("token") || "";
	const isHiddenMode = paramToken === process.env.NEXT_PUBLIC_HIDDEN_MODE_TOKEN;

	return (
		<>
			<Header isHiddenMode={isHiddenMode} />
			<main>
				<Suspense fallback={<div>Loading...</div>}>
					<TrackPageContent
						isHiddenMode={isHiddenMode}
						idOverride={idOverride}
					/>
				</Suspense>
			</main>
			<Footer isHiddenMode={isHiddenMode} />
		</>
	);
}
