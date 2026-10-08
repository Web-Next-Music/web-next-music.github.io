"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { NowPlaying } from "@/types/player";
import { PlayerContext } from "./context";
import { useRichPresence } from "./hooks";
import { stableTrackKey } from "@/lib/track/trackKey";
import { MiniPlayerInner } from "@/components/miniplayer/MiniPlayer";

export function PlayerProvider({ children }: { children: React.ReactNode }) {
	const searchParams = useSearchParams();
	const paramToken = searchParams.get("token") ?? "";
	const isHiddenMode = paramToken === process.env.NEXT_PUBLIC_HIDDEN_MODE_TOKEN;

	const audioRef = useRef<HTMLAudioElement>(null);
	const currentTrackUrlRef = useRef<string | null>(null);

	const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);

	useRichPresence(nowPlaying, isPlaying, audioRef);

	const play = useCallback((track: NowPlaying) => {
		const source = track.directUrl ?? track.url;
		const id =
			(track.id && !/^https?:\/\//.test(track.id) ? track.id : undefined) ||
			stableTrackKey(source, track.title, track.artist, track.cover);
		setNowPlaying({ ...track, id });
		if (currentTrackUrlRef.current === track.url) {
			void audioRef.current?.play().catch(() => setIsPlaying(false));
		}
	}, []);

	const pause = useCallback(() => {
		audioRef.current?.pause();
		setIsPlaying(false);
	}, []);

	const resume = useCallback(() => {
		void audioRef.current?.play().catch(() => setIsPlaying(false));
	}, []);

	const close = useCallback(() => {
		audioRef.current?.pause();
		setNowPlaying(null);
		setIsPlaying(false);
	}, []);

	const seek = useCallback((seconds: number) => {
		const audio = audioRef.current;
		if (audio && audio.readyState >= 1 && Number.isFinite(seconds)) {
			audio.currentTime = Math.max(
				0,
				Math.min(
					seconds,
					Number.isFinite(audio.duration) ? audio.duration : seconds,
				),
			);
		}
	}, []);

	const setVolume = useCallback((volume: number) => {
		if (audioRef.current) audioRef.current.volume = volume;
	}, []);

	const setMuted = useCallback((muted: boolean) => {
		if (audioRef.current) audioRef.current.muted = muted;
	}, []);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		if (currentTrackUrlRef.current !== (nowPlaying?.url ?? null)) {
			const previous = currentTrackUrlRef.current;
			audio.pause();
			setIsPlaying(false);
			if (previous?.startsWith("blob:")) URL.revokeObjectURL(previous);
			if (!nowPlaying) {
				currentTrackUrlRef.current = null;
				audio.removeAttribute("src");
				audio.load();
				return;
			}
			currentTrackUrlRef.current = nowPlaying.url;
			audio.src = nowPlaying.url;
			audio.currentTime = 0;
			const requestedSource = nowPlaying.url;
			void audio.play().catch(() => {
				if (currentTrackUrlRef.current === requestedSource) setIsPlaying(false);
			});
		}
	}, [nowPlaying]);

	useEffect(
		() => () => {
			const source = currentTrackUrlRef.current;
			if (source?.startsWith("blob:")) URL.revokeObjectURL(source);
		},
		[],
	);

	return (
		<PlayerContext.Provider
			value={{
				nowPlaying,
				isPlaying,
				play,
				pause,
				resume,
				close,
				seek,
				setVolume,
				setMuted,
				audioRef,
			}}
		>
			<audio
				ref={audioRef}
				onPlaying={() => setIsPlaying(true)}
				onPause={() => setIsPlaying(false)}
				onEnded={() => setIsPlaying(false)}
				onError={() => setIsPlaying(false)}
				onEmptied={() => setIsPlaying(false)}
			/>
			{children}
			<MiniPlayerInner isHiddenMode={isHiddenMode} />
		</PlayerContext.Provider>
	);
}
