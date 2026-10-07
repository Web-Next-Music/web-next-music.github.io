"use client";

import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useRef, useState, type CSSProperties } from "react";
import styles from "./FeatureVideoPlayer.module.scss";

interface Props {
	src: string;
}

function formatTime(seconds: number) {
	if (!Number.isFinite(seconds)) return "0:00";
	const minutes = Math.floor(seconds / 60);
	const remainder = Math.floor(seconds % 60);
	return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export default function FeatureVideoPlayer({ src }: Props) {
	const playerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const [playing, setPlaying] = useState(false);
	const [muted, setMuted] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [aspectRatio, setAspectRatio] = useState(16 / 9);
	const [error, setError] = useState(false);

	const togglePlayback = async () => {
		const video = videoRef.current;
		if (!video) return;

		if (video.paused) {
			await video.play();
		} else {
			video.pause();
		}
	};

	const toggleFullscreen = async () => {
		if (!playerRef.current) return;
		if (document.fullscreenElement) {
			await document.exitFullscreen();
		} else {
			await playerRef.current.requestFullscreen();
		}
	};

	return (
		<div ref={playerRef} className={styles.player} style={{ aspectRatio }}>
			<video
				ref={videoRef}
				className={styles.video}
				src={src}
				preload="metadata"
				playsInline
				muted={muted}
				onClick={togglePlayback}
				onPlay={() => setPlaying(true)}
				onPause={() => setPlaying(false)}
				onEnded={() => setPlaying(false)}
				onLoadedMetadata={(event) => {
					const video = event.currentTarget;
					setDuration(video.duration);
					if (video.videoWidth && video.videoHeight) {
						setAspectRatio(video.videoWidth / video.videoHeight);
					}
				}}
				onResize={(event) => {
					const video = event.currentTarget;
					if (video.videoWidth && video.videoHeight) {
						setAspectRatio(video.videoWidth / video.videoHeight);
					}
				}}
				onTimeUpdate={(event) =>
					setCurrentTime(event.currentTarget.currentTime)
				}
				onError={() => setError(true)}
			/>
			{error ? (
				<div className={styles.error}>
					<span>Video could not be loaded</span>
					<a href={src} target="_blank" rel="noreferrer">
						Open attachment
					</a>
				</div>
			) : (
				<>
					{!playing && (
						<button
							type="button"
							className={styles.centerPlay}
							onClick={togglePlayback}
							aria-label="Play video"
						>
							<Play size={24} fill="currentColor" />
						</button>
					)}
					<div className={styles.controls}>
						<button
							type="button"
							className={styles.controlButton}
							onClick={togglePlayback}
							aria-label={playing ? "Pause video" : "Play video"}
						>
							{playing ? (
								<Pause size={17} fill="currentColor" />
							) : (
								<Play size={17} fill="currentColor" />
							)}
						</button>
						<span className={styles.time}>{formatTime(currentTime)}</span>
						<input
							type="range"
							className={styles.progress}
							min="0"
							max={duration || 0}
							step="0.01"
							value={Math.min(currentTime, duration || 0)}
							aria-label="Video progress"
							style={
								{
									"--progress": `${duration ? (currentTime / duration) * 100 : 0}%`,
								} as CSSProperties
							}
							onChange={(event) => {
								const time = Number(event.target.value);
								if (videoRef.current) videoRef.current.currentTime = time;
								setCurrentTime(time);
							}}
						/>
						<span className={styles.time}>{formatTime(duration)}</span>
						<button
							type="button"
							className={styles.controlButton}
							onClick={() => setMuted((value) => !value)}
							aria-label={muted ? "Unmute video" : "Mute video"}
						>
							{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
						</button>
						<button
							type="button"
							className={styles.controlButton}
							onClick={toggleFullscreen}
							aria-label="Toggle fullscreen"
						>
							<Maximize2 size={16} />
						</button>
					</div>
				</>
			)}
		</div>
	);
}
