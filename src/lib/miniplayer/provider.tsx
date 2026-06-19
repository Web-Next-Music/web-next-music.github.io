"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { NowPlaying } from "@/types/player";
import { PlayerContext } from "./context";
import { useRichPresenceWS } from "./hooks";
import { MiniPlayerInner } from "@/components/miniplayer/MiniPlayer";

const MINIPLAYER_STORAGE_KEY = "nm:miniplayer";

export function PlayerProvider({ children }: { children: React.ReactNode }) {
	const searchParams = useSearchParams();
	const paramToken = searchParams.get("token") ?? "";
	const isHiddenMode = paramToken === process.env.NEXT_PUBLIC_HIDDEN_MODE_TOKEN;

	const audioRef = useRef<HTMLAudioElement>(null);
	const isRestoringRef = useRef(false);
	const currentTrackUrlRef = useRef<string | null>(null);
	const pendingSeekTimeRef = useRef<number>(0);

	const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(() => {
		if (typeof window === "undefined") return null;
		try {
			const raw = sessionStorage.getItem(MINIPLAYER_STORAGE_KEY);
			if (!raw) return null;
			const saved = JSON.parse(raw) as {
				track: NowPlaying;
				time: number;
			};
			isRestoringRef.current = true;
			pendingSeekTimeRef.current = saved.time ?? 0;
			return saved.track;
		} catch {
			return null;
		}
	});
	const [isPlaying, setIsPlaying] = useState(false);

	useRichPresenceWS(nowPlaying, isPlaying, audioRef);

	const play = useCallback((track: NowPlaying) => {
		const id =
			track.id && !track.directUrl ? track.id : (track.url ?? undefined);
		currentTrackUrlRef.current = null;
		setNowPlaying({ ...track, id });
		setIsPlaying(true);
	}, []);

	const pause = useCallback(() => {
		audioRef.current?.pause();
		setIsPlaying(false);
	}, []);

	const resume = useCallback(() => {
		audioRef.current?.play();
		setIsPlaying(true);
	}, []);

	const close = useCallback(() => {
		audioRef.current?.pause();
		setNowPlaying(null);
		setIsPlaying(false);
	}, []);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio || !nowPlaying) return;

		if (currentTrackUrlRef.current !== nowPlaying.url) {
			currentTrackUrlRef.current = nowPlaying.url;
			audio.src = nowPlaying.url;
			if (isRestoringRef.current) {
				const seekTime = pendingSeekTimeRef.current;
				audio.addEventListener(
					"loadedmetadata",
					() => {
						audio.currentTime = seekTime;

						audio
							.play()
							.then(() => setIsPlaying(true))
							.catch(() => setIsPlaying(false));
						isRestoringRef.current = false;
					},
					{ once: true },
				);
			} else {
				audio.currentTime = 0;
				audio.play().catch(console.error);
			}
		}
	}, [nowPlaying]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!nowPlaying) {
			sessionStorage.removeItem(MINIPLAYER_STORAGE_KEY);
			return;
		}
		const audio = audioRef.current;
		let lastWrite = 0;
		const save = () => {
			const now = Date.now();
			if (now - lastWrite < 1000) return;
			lastWrite = now;
			sessionStorage.setItem(
				MINIPLAYER_STORAGE_KEY,
				JSON.stringify({ track: nowPlaying, time: audio?.currentTime ?? 0 }),
			);
		};
		save();
		audio?.addEventListener("timeupdate", save);
		return () => audio?.removeEventListener("timeupdate", save);
	}, [nowPlaying]);

	return (
		<PlayerContext.Provider
			value={{
				nowPlaying,
				isPlaying,
				play,
				pause,
				resume,
				close,
				audioRef,
			}}
		>
			<audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
			{children}
			<MiniPlayerInner isHiddenMode={isHiddenMode} />
		</PlayerContext.Provider>
	);
}
