"use client";

import Image from "next/image";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
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
import { fetchLyrics, type LrcResult } from "@/lib/track/lyrics";
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

	useEffect(() => {
		if (!id || idOverride || rawKey || directUrl) return;
		if (pathname !== "/track") return;
		router.replace(`/track/${id}`);
	}, [directUrl, id, idOverride, pathname, rawKey, router]);

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
			if (found) setTrack(found);
			else setNotFound(true);
		}
		// For url mode, displayTrack will be used from the virtual track
	}, [storeReady, id, directUrl]);

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

	const isThisPlaying = isThisLoaded && player?.isPlaying;

	// No fallback needed - displayTrack handles all cases

	if (!storeReady) {
		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center gap-3.5 p-10 text-center">
				<div className="flex items-center gap-1.5 [&_span]:size-1.75 [&_span]:animate-[nm-pulse-glow_1.2s_ease-in-out_infinite] [&_span]:rounded-full [&_span]:bg-accent [&_span]:opacity-40 [&_span:nth-child(2)]:[animation-delay:.2s] [&_span:nth-child(3)]:[animation-delay:.4s]">
					<span />
					<span />
					<span />
				</div>
				<p className="text-sm text-muted">Loading track…</p>
			</div>
		);
	}

	if (notFound) {
		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center gap-3.5 p-10 text-center">
				<div className="opacity-50">
					<InfoCircleIcon width={48} height={48} />
				</div>
				<h2 className="font-(family-name:--font-heading-large) text-[22px] font-bold text-foreground">
					Track not found
				</h2>

				<p className="text-sm text-muted">
					{id ? `Track with ID ${id} was not found` : "Track not found"}
				</p>
				<button
					className="mt-2 rounded-sm border border-border bg-surface px-4.5 py-2.25 text-[13px] text-foreground transition hover:border-accent hover:text-accent"
					onClick={() => router.back()}
				>
					Back
				</button>
			</div>
		);
	}

	if (!displayTrack) {
		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center gap-3.5 p-10 text-center">
				<div className="flex items-center gap-1.5 [&_span]:size-1.75 [&_span]:animate-[nm-pulse-glow_1.2s_ease-in-out_infinite] [&_span]:rounded-full [&_span]:bg-accent [&_span]:opacity-40 [&_span:nth-child(2)]:[animation-delay:.2s] [&_span:nth-child(3)]:[animation-delay:.4s]">
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
		<div className="mx-auto max-w-255 py-5 max-[720px]:px-1.25 max-[720px]:pt-6.25 max-[720px]:pb-3.75">
			<div
				className={`flex items-start gap-3 px-2.5 max-[720px]:flex-col max-[720px]:items-stretch ${!showLyrics ? "justify-center" : ""}`}
			>
				<button
					className="mt-0 flex size-8 shrink-0 items-center justify-center self-start rounded-sm border border-border bg-surface text-muted transition-[color,border-color,background] hover:border-accent hover:bg-surface-raised hover:text-foreground max-[720px]:mb-3.75"
					onClick={() => router.back()}
					style={{
						display: isHiddenMode ? "none" : "auto",
					}}
				>
					<ArrowLeftIcon />
				</button>
				<div
					className={`grid min-w-0 flex-1 grid-cols-[300px_1fr] items-start gap-4 max-[720px]:grid-cols-1 ${!showLyrics ? "flex-none grid-cols-[360px] max-[720px]:grid-cols-1" : ""}`}
				>
					<div className="relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-border bg-surface p-5 max-[720px]:static max-[720px]:flex-row max-[720px]:flex-wrap max-[720px]:gap-3">
						<div className="group relative aspect-square w-full shrink-0 overflow-hidden rounded-md max-[720px]:w-22.5">
							{displayTrack?.cover ? (
								<Image
									src={displayTrack?.cover}
									alt={displayTrack?.title}
									fill
									sizes="(max-width: 720px) 90px, 300px"
									className="block size-full rounded-md border border-border object-cover"
								/>
							) : (
								<div className="flex size-full items-center justify-center rounded-md border border-border bg-surface-raised">
									<MusicNoteIcon width={48} height={48} />
								</div>
							)}

							<button
								className="absolute inset-0 z-2 flex items-center justify-center border-0 bg-transparent text-white opacity-0 transition-opacity group-hover:opacity-100"
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
									<div className="inline-flex items-center gap-0.75 [&_span]:size-1 [&_span]:animate-[nm-pulse-glow_1.2s_ease-in-out_infinite] [&_span]:rounded-full [&_span]:bg-accent [&_span]:opacity-50 [&_span:nth-child(2)]:[animation-delay:.2s] [&_span:nth-child(3)]:[animation-delay:.4s]">
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
								<div className="absolute right-2.5 bottom-2.5 z-3 flex items-end gap-0.75 [&_span]:origin-bottom [&_span]:animate-[waveBar_1s_ease-in-out_infinite] [&_span]:rounded-xs [&_span]:bg-accent [&_span:nth-child(1)]:h-2 [&_span:nth-child(2)]:h-3.5 [&_span:nth-child(2)]:[animation-delay:.15s] [&_span:nth-child(3)]:h-1.5 [&_span:nth-child(3)]:[animation-delay:.3s]">
									<span />
									<span />

									<span />
								</div>
							)}
						</div>

						<div className="flex flex-col gap-2.5 max-[720px]:min-w-0 max-[720px]:flex-1">
							<div className="flex items-center justify-between gap-2">
								<div>
									<div className="flex items-center justify-between gap-2">
										<h1 className="mt-1 font-sans text-[18px] font-extrabold tracking-[-0.3px] text-foreground max-[720px]:text-base">
											{displayTrack?.title}
										</h1>
									</div>
									<p className="mt-2.5 text-[13px] font-bold text-muted">
										{displayTrack?.artist || "Unknown artist"}
									</p>
								</div>
								{(displayTrack?.id || directUrl) && (
									<LikeButton
										compact
										className="size-8.5 shrink-0 rounded-full opacity-100 [&_svg]:size-4.5"
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
								<p className="m-0 text-[11px] font-bold text-muted opacity-50">
									ID: {displayTrack?.id}
								</p>
							)}
						</div>

						<div className="flex flex-col gap-2.5 max-[720px]:w-full max-[720px]:flex-row max-[720px]:flex-wrap">
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
										} catch {
											setShowDownloadError(true);
										} finally {
											setIsDownloading(false);
										}
									}}
									disabled={isDownloading}
									className="inline-flex w-full items-center justify-center gap-1.75 rounded-sm border border-border bg-surface-raised px-3.5 py-2.25 text-[13px] font-bold text-foreground transition hover:border-accent hover:text-accent max-[720px]:min-w-25 max-[720px]:flex-1 max-[720px]:w-auto"
								>
									<DownloadTrackIcon size={15} />

									{isDownloading ? "Downloading..." : "Download"}
								</button>
							)}

							{directUrl && !id && (
								<button
									onClick={handleCopyKey}
									className="inline-flex w-full items-center justify-center gap-1.75 rounded-sm border border-border bg-surface-raised px-3.5 py-2.25 text-[13px] font-bold text-foreground transition hover:border-accent hover:text-accent max-[720px]:min-w-25 max-[720px]:flex-1 max-[720px]:w-auto"
								>
									<ClipboardIcon size={15} />

									{copyKeyFeedback === "copied" ? "Copied!" : "Copy key"}
								</button>
							)}

							{displayTrack?.yandexUrl && (
								<a
									href={displayTrack?.yandexUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex w-full items-center justify-center gap-1.75 rounded-sm border border-border bg-surface-raised px-3.5 py-2.25 text-[13px] font-bold text-foreground transition hover:border-accent hover:text-accent max-[720px]:min-w-25 max-[720px]:flex-1 max-[720px]:w-auto"
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
						<div className="sticky top-20 flex h-[calc(100dvh-160px)] min-h-100 max-h-205 flex-col overflow-hidden rounded-2xl border border-border bg-surface max-[720px]:static max-[720px]:h-[55vh] max-[720px]:min-h-75">
							<div className="flex shrink-0 items-center justify-between border-b border-border px-4.5 py-3">
								<span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[.5px] text-muted uppercase">
									{lyricsLoading ? (
										<>
											<span className="inline-flex items-center gap-0.75 [&_span]:size-1 [&_span]:animate-[nm-pulse-glow_1.2s_ease-in-out_infinite] [&_span]:rounded-full [&_span]:bg-accent [&_span]:opacity-50 [&_span:nth-child(2)]:[animation-delay:.2s] [&_span:nth-child(3)]:[animation-delay:.4s]">
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
										className="text-[11px] font-bold text-muted no-underline opacity-60 transition hover:text-accent hover:opacity-100"
									>
										via lrclib.net
									</a>
								)}
							</div>

							{lyricsLoading && (
								<div className="flex flex-1 flex-col gap-4 p-4.5">
									{[80, 55, 90, 45, 70, 60, 85, 50, 75, 40].map((w, i) => (
										<div
											key={i}
											className="h-4.25 animate-[shimmer_1.4s_ease-in-out_infinite] rounded-xs bg-surface-raised"
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
									className="flex-1 overflow-y-auto overscroll-contain px-4.5 pt-4 [scrollbar-color:var(--border)_transparent] scrollbar-thin [&::-webkit-scrollbar]:w-0.75 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
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
												"cursor-pointer rounded-sm px-2.5 py-1.5 font-(family-name:--font-montserrat) text-[17px] font-bold leading-normal text-muted opacity-50 transition-[color,opacity,transform,background] hover:bg-surface-raised hover:text-foreground hover:opacity-85",
												i === activeLine
													? "translate-x-1 bg-(--active-lyrics-line-background-color) text-foreground! opacity-100"
													: "",
												i < activeLine ? "opacity-30" : "",
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
											<span className="inline-block w-[calc(100%-18px)] origin-left transition-transform">
												{line.text}
											</span>
										</div>
									))}
									<div className="h-1/2 shrink-0" />
								</div>
							)}

							{!lyricsLoading && !isSynced && hasLyrics && (
								<div className="flex-1 overflow-y-auto px-6 py-4.5 [scrollbar-color:var(--border)_transparent] scrollbar-thin">
									{lyrics!.plain!.split("\n").map((line, i) => (
										<p
											key={i}
											className="m-0 animate-[lineIn_.35s_ease_both] font-(family-name:--font-heading-large) text-base leading-[1.85] text-foreground"
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
								<div className="flex flex-1 flex-col items-center justify-center gap-3.5 p-10 text-center text-sm text-muted">
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
