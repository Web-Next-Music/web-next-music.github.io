"use client";

import Image from "next/image";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/lib/miniplayer/context";
import {
	useDesktopRpcEnabled,
	setDesktopRpcEnabled,
} from "@/lib/miniplayer/hooks";
import { encodeTrackKey, decodeTrackKey } from "@/lib/track/trackKey";
import LikeButton from "@/components/common/LikeButton";
import LogoIcon from "@/components/common/LogoIcon";

export function MiniPlayerInner({ isHiddenMode }: { isHiddenMode: boolean }) {
	const player = usePlayer();
	const router = useRouter();
	const nowPlaying = player?.nowPlaying ?? null;
	const audioRef = player?.audioRef;
	const [progress, setProgress] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const [muted, setMuted] = useState(false);
	const rpcEnabled = useDesktopRpcEnabled();

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = parseFloat(e.target.value);
		setVolume(val);
		player?.setVolume(val);
		player?.setMuted(val === 0);
		setMuted(val === 0);
	};

	const toggleMute = () => {
		const next = !muted;
		setMuted(next);
		player?.setMuted(next);
	};

	const effectiveVolume = muted ? 0 : volume;

	useEffect(() => {
		const audio = audioRef?.current;
		if (!audio) return;
		const onTime = () => setProgress(audio.currentTime);
		const onDur = () => setDuration(audio.duration);
		audio.addEventListener("timeupdate", onTime);
		audio.addEventListener("durationchange", onDur);
		return () => {
			audio.removeEventListener("timeupdate", onTime);
			audio.removeEventListener("durationchange", onDur);
		};
	}, [audioRef]);

	const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const ratio = (e.clientX - rect.left) / rect.width;
		if (duration) player?.seek(ratio * duration);
	};

	const fmt = (s: number) => {
		if (!isFinite(s)) return "0:00";
		const m = Math.floor(s / 60);
		const sec = Math.floor(s % 60);
		return `${m}:${sec.toString().padStart(2, "0")}`;
	};

	useEffect(() => {
		const root = document.documentElement;
		if (nowPlaying) {
			document.body.classList.add("has-mini-player");
			root.style.setProperty("--mini-player-h", "47px");
		} else {
			document.body.classList.remove("has-mini-player");
			root.style.setProperty("--mini-player-h", "0px");
		}
		return () => {
			document.body.classList.remove("has-mini-player");
			root.style.setProperty("--mini-player-h", "0px");
		};
	}, [nowPlaying]);

	if (!player || !nowPlaying) return null;
	const { isPlaying, pause, resume, close } = player;

	const pct = duration ? (progress / duration) * 100 : 0;
	const trackId = nowPlaying.id;

	return (
		<div
			className={
				"items-center flex h-12 [background:var(--bg)] [border-bottom:1px_solid_var(--border)] fixed top-[calc(59px+var(--ban-banner-h,0px))] left-0 right-0 z-9 animate-[slideDown_0.2s_ease]"
			}
		>
			<div
				className={
					"flex items-center gap-2.5 w-full p-[0_20px] [@media(max-width:_900px)]:p-[0_10px]"
				}
			>
				<div className={"flex items-center gap-2 shrink-0"}>
					<div
						className={
							"flex items-center gap-2.5 cursor-pointer opacity-100 [transition:opacity_0.15s] hover:opacity-[0.7]"
						}
						style={{
							pointerEvents: isHiddenMode ? "none" : "auto",
						}}
						onClick={() => {
							if (nowPlaying.directUrl) {
								const key = encodeTrackKey({
									url: nowPlaying.directUrl,
									title: nowPlaying.title,
									artist: nowPlaying.artist,
									cover: nowPlaying.cover,
								});
								router.push(`/track?key=${key}`);
							} else if (trackId?.endsWith("-e")) {
								router.push(`/track?key=${trackId}`);
							} else if (
								trackId &&
								!trackId.startsWith("http") &&
								decodeTrackKey(trackId)?.url
							) {
								// trackId is an encoded key - use it directly as ?key=
								router.push(`/track?key=${trackId}`);
							} else if (trackId) {
								router.push(`/track?id=${trackId}`);
							}
						}}
					>
						{nowPlaying.cover ? (
							<Image
								src={nowPlaying.cover}
								alt=""
								width={30}
								height={30}
								className={
									"w-7.5 h-7.5 rounded-xs object-cover [border:1px_solid_var(--border)] shrink-0"
								}
							/>
						) : (
							<div
								className={
									"w-7.5 h-7.5 rounded-xs [background:var(--surface2)] [border:1px_solid_var(--border)] shrink-0"
								}
							/>
						)}
						<div
							className={
								"flex flex-col min-w-0 w-full max-w-33 mr-2.5 [@media(max-width:_900px)]:hidden"
							}
						>
							<span
								className={
									"text-[12px] font-extrabold whitespace-nowrap overflow-hidden text-ellipsis text-foreground"
								}
							>
								{nowPlaying.title}
							</span>
							<span
								className={
									"text-[11px] font-bold text-muted whitespace-nowrap overflow-hidden text-ellipsis"
								}
							>
								{nowPlaying.artist}
							</span>
						</div>
					</div>
					{trackId && (
						<LikeButton
							compact
							className={"opacity-100 w-7 h-7 rounded-xs"}
							target={{
								type: "track",
								trackId,
								meta: {
									title: nowPlaying.title,
									artist: nowPlaying.artist,
									cover: nowPlaying.cover,
									mp3_url: nowPlaying.url,
								},
							}}
						/>
					)}
				</div>

				<span
					className={
						"text-[11px] font-bold text-muted font-[SF_Mono,Fira_Code,monospace] whitespace-nowrap shrink-0 min-w-7.5 text-center"
					}
				>
					{fmt(progress)}
				</span>
				<div
					className={
						'flex-1 h-5 flex items-center cursor-pointer relative [&::before]:[content:""] [&::before]:absolute [&::before]:left-0 [&::before]:right-0 [&::before]:h-0.75 [&::before]:[background:var(--surface2)] [&::before]:rounded-(--radius-pill) [&::before]:[transition:height_0.15s] [&:hover::before]:h-1.25 [&:hover_.progressFill]:h-1.25'
					}
					onClick={handleSeek}
				>
					<div
						className={
							"[.progressWrap:hover_&]:h-1.25 absolute left-0 h-0.75 [background:linear-gradient(90deg,var(--accent2)_50%,var(--accent)_100%)] rounded-(--radius-pill) pointer-events-none [transition:width_0.1s_linear,height_0.15s]"
						}
						style={{ width: `${pct}%` }}
					/>
				</div>
				<span
					className={
						"text-[11px] font-bold text-muted font-[SF_Mono,Fira_Code,monospace] whitespace-nowrap shrink-0 min-w-7.5 text-center"
					}
				>
					{fmt(duration)}
				</span>

				<button
					className={
						"flex items-center justify-center w-7 h-7 rounded-xs [border:1px_solid_var(--border)] [background:var(--surface)] text-foreground cursor-pointer shrink-0 [transition:background_0.15s,border-color_0.15s,color_0.15s] hover:[background:var(--surface2)] hover:border-accent hover:text-accent"
					}
					onClick={isPlaying ? pause : resume}
					aria-label={isPlaying ? "Pause" : "Play"}
				>
					{isPlaying ? (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<rect x="14" y="3" width="5" height="18" rx="1" />
							<rect x="5" y="3" width="5" height="18" rx="1" />
						</svg>
					) : (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
						</svg>
					)}
				</button>

				<div
					className={
						"flex items-center shrink-0 hover:gap-1.25 focus-within:gap-1.25 [&:hover_.volumeSliderWrap]:w-18 [&:hover_.volumeSliderWrap]:opacity-100 [&:focus-within_.volumeSliderWrap]:w-18 [&:focus-within_.volumeSliderWrap]:opacity-100"
					}
				>
					<button
						className={
							"flex items-center justify-center w-7 h-7 rounded-xs [border:1px_solid_var(--border)] [background:var(--surface)] text-foreground cursor-pointer shrink-0 [transition:background_0.15s,border-color_0.15s,color_0.15s] hover:[background:var(--surface2)] hover:border-accent hover:text-accent"
						}
						onClick={toggleMute}
						aria-label={muted ? "Unmute" : "Mute"}
					>
						{effectiveVolume === 0 ? (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="17"
								height="15"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
								<line x1="22" x2="16" y1="9" y2="15" />
								<line x1="16" x2="22" y1="9" y2="15" />
							</svg>
						) : effectiveVolume < 0.5 ? (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="17"
								height="15"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
								<path d="M16 9a5 5 0 0 1 0 6" />
							</svg>
						) : (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="17"
								height="15"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
								<path d="M16 9a5 5 0 0 1 0 6" />
								<path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
							</svg>
						)}
					</button>
					<div
						className={
							"[.volumeWrap:hover_&]:w-18 [.volumeWrap:hover_&]:opacity-100 [.volumeWrap:focus-within_&]:w-18 [.volumeWrap:focus-within_&]:opacity-100 w-0 overflow-hidden opacity-0 -mt-2.5 [transition:width_0.2s_ease,opacity_0.2s_ease]"
						}
					>
						<input
							type="range"
							min="0"
							max="1"
							step="0.02"
							value={muted ? 0 : volume}
							onChange={handleVolumeChange}
							className={
								"[-webkit-appearance:none] appearance-none w-17 h-0.75 rounded-(--radius-pill) outline-none cursor-pointer [background:linear-gradient(to_right,var(--accent2)_0%,var(--accent)_var(--vol,100%),var(--surface2)_var(--vol,100%),var(--surface2)_100%)] [&::-webkit-slider-thumb]:[-webkit-appearance:none] [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-(--radius-full) [&::-webkit-slider-thumb]:[background:var(--accent)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:[border:none] [&::-webkit-slider-thumb]:[transition:transform_0.1s] [&::-webkit-slider-thumb:hover]:transform-[scale(1.25)] [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-(--radius-full) [&::-moz-range-thumb]:[background:var(--accent)] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:[border:none]"
							}
							aria-label="Volume"
							style={
								{
									"--vol": `${effectiveVolume * 100}%`,
								} as React.CSSProperties
							}
						/>
					</div>
				</div>

				<button
					className={`${"flex items-center justify-center w-7 h-7 rounded-xs [border:1px_solid_var(--border)] [background:var(--surface)] text-foreground cursor-pointer shrink-0 [transition:background_0.15s,border-color_0.15s,color_0.15s] hover:[background:var(--surface2)] hover:border-accent hover:text-accent"} ${"[@media(max-width:_640px)]:hidden"}`}
					onClick={() => setDesktopRpcEnabled(!rpcEnabled)}
					aria-label={
						rpcEnabled
							? "Disable desktop Discord status"
							: "Enable desktop Discord status"
					}
					title={
						rpcEnabled
							? "Desktop Discord status: on"
							: "Desktop Discord status: off (opens the Next Music app)"
					}
					style={{ opacity: rpcEnabled ? 1 : 0.4 }}
				>
					<LogoIcon size={18} />
				</button>

				<button
					className={
						"flex items-center justify-center w-7 h-7 rounded-xs [border:1px_solid_var(--border)] [background:var(--surface)] text-foreground cursor-pointer shrink-0 [transition:background_0.15s,border-color_0.15s,color_0.15s] hover:[background:var(--surface2)] hover:border-accent hover:text-accent"
					}
					onClick={close}
					aria-label="Close player"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</button>
			</div>
		</div>
	);
}
