"use client";

import { useEffect, useRef, useCallback } from "react";
import type { NowPlaying } from "@/types/player";
import { encodeTrackKey } from "@/lib/track/trackKey";

function base64url(str: string): string {
	const b64 = btoa(unescape(encodeURIComponent(str)));
	return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const RESYNC_MS = 3000;

function pushRpc(payload: object) {
	try {
		const url = `nextmusic://rpc?data=${base64url(JSON.stringify(payload))}`;
		const iframe = document.createElement("iframe");
		iframe.style.display = "none";
		iframe.src = url;
		document.body.appendChild(iframe);
		setTimeout(() => iframe.remove(), 1000);
	} catch {
		/* no client installed — silent no-op */
	}
}

export function useRichPresenceWS(
	nowPlaying: NowPlaying | null,
	isPlaying: boolean,
	audioRef: React.RefObject<HTMLAudioElement | null>,
) {
	const nowPlayingRef = useRef(nowPlaying);
	const isPlayingRef = useRef(isPlaying);
	const lastSentRef = useRef<string | null>(null);
	const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		nowPlayingRef.current = nowPlaying;
	}, [nowPlaying]);
	useEffect(() => {
		isPlayingRef.current = isPlaying;
	}, [isPlaying]);

	const buildPayload = useCallback(
		(state: "playing" | "paused" | "stopped") => {
			const audio = audioRef.current;
			const np = nowPlayingRef.current;
			const positionSec = audio?.currentTime ?? 0;
			const durationSec =
				audio?.duration && isFinite(audio.duration) ? audio.duration : 0;
			const trackId = np?.id ?? np?.url.match(/\/(\d+)\.mp3$/)?.[1] ?? "";
			const trackUrl = np?.directUrl ?? np?.url ?? null;
			const nmUGCPlayerUrl = trackId.includes("-")
				? (() => {
						const key = encodeTrackKey({
							url: trackUrl || "",
							title: np?.title,
							artist: np?.artist,
							cover: np?.cover,
						});
						return `${window.location.origin}/track?key=${key}`;
					})()
				: null;
			return {
				playerState: state,
				title: np?.title ?? "",
				artists: np?.artist ?? "",
				img: np?.cover ?? "icon",
				albumUrl: "",
				artistUrl: "",
				trackId,
				trackUrl,
				nmUGCPlayerUrl,
				positionSec,
				durationSec,
			};
		},
		[audioRef],
	);

	const send = useCallback(
		(state: "playing" | "paused" | "stopped", force = false) => {
			const payload = buildPayload(state);
			const key = `${payload.playerState}|${payload.trackId}|${payload.title}`;
			if (!force && key === lastSentRef.current) return;
			lastSentRef.current = key;
			pushRpc(payload);
		},
		[buildPayload],
	);

	const stopTick = useCallback(() => {
		if (tickRef.current) {
			clearInterval(tickRef.current);
			tickRef.current = null;
		}
	}, []);

	const startTick = useCallback(() => {
		stopTick();
		tickRef.current = setInterval(() => {
			if (isPlayingRef.current) send("playing", true);
		}, RESYNC_MS);
	}, [send, stopTick]);

	useEffect(() => {
		const audio = audioRef.current;
		stopTick();

		if (!nowPlaying) {
			send("stopped");
			return;
		}

		const onReady = () => {
			const playing = isPlayingRef.current;
			send(playing ? "playing" : "paused");
			if (playing) startTick();
		};

		if (audio) {
			if (audio.duration && isFinite(audio.duration)) {
				onReady();
			} else {
				audio.addEventListener("durationchange", onReady, { once: true });
			}
		}

		return () => {
			audio?.removeEventListener("durationchange", onReady);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nowPlaying?.url]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		const onSeeked = () => {
			if (!nowPlayingRef.current) return;
			send(isPlayingRef.current ? "playing" : "paused", true);
		};
		audio.addEventListener("seeked", onSeeked);
		return () => audio.removeEventListener("seeked", onSeeked);
	}, [audioRef, send]);

	useEffect(() => {
		if (!nowPlaying) return;
		const audio = audioRef.current;
		if (!audio?.duration || !isFinite(audio.duration)) return;
		send(isPlaying ? "playing" : "paused");
		if (isPlaying) startTick();
		else stopTick();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isPlaying]);

	useEffect(() => {
		return () => {
			stopTick();
			send("stopped");
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
}
