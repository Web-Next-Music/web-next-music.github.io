"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { NowPlaying } from "@/types/player";
import { encodeTrackKey } from "@/lib/track/trackKey";

function base64url(str: string): string {
	const b64 = btoa(unescape(encodeURIComponent(str)));
	return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const RESYNC_MS = 3000;
const RPC_STORAGE_KEY = "nm-desktop-rpc";
const rpcSubscribers = new Set<() => void>();

export function isDesktopRpcEnabled(): boolean {
	try {
		return localStorage.getItem(RPC_STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}

export function setDesktopRpcEnabled(on: boolean): void {
	try {
		localStorage.setItem(RPC_STORAGE_KEY, on ? "1" : "0");
	} catch {}
	rpcSubscribers.forEach((subscriber) => subscriber());
}

function subscribeRpc(cb: () => void): () => void {
	rpcSubscribers.add(cb);
	const onStorage = (event: StorageEvent) => {
		if (event.key === RPC_STORAGE_KEY) cb();
	};
	window.addEventListener("storage", onStorage);
	return () => {
		rpcSubscribers.delete(cb);
		window.removeEventListener("storage", onStorage);
	};
}

export function useDesktopRpcEnabled(): boolean {
	return useSyncExternalStore(subscribeRpc, isDesktopRpcEnabled, () => false);
}

function pushRpc(payload: object, onComplete?: () => void) {
	try {
		const url = `nextmusic://rpc?data=${base64url(JSON.stringify(payload))}`;
		const iframe = document.createElement("iframe");
		iframe.style.display = "none";
		iframe.src = url;
		document.body.appendChild(iframe);
		const timer = setTimeout(() => {
			iframe.remove();
			onComplete?.();
		}, 1000);
		return () => {
			clearTimeout(timer);
			iframe.remove();
		};
	} catch {}
}

export function useRichPresence(
	nowPlaying: NowPlaying | null,
	isPlaying: boolean,
	audioRef: React.RefObject<HTMLAudioElement | null>,
) {
	const enabled = useDesktopRpcEnabled();
	const wasEnabled = useRef(false);
	useEffect(() => {
		const cleanups = new Set<() => void>();
		const send = (stopped = false) => {
			const audio = audioRef.current;
			const np = stopped ? null : nowPlaying;
			const trackId = np?.id ?? "";
			const trackUrl = np?.directUrl ?? np?.url ?? null;
			let cleanup: (() => void) | undefined;
			cleanup = pushRpc(
				{
					playerState: !np ? "stopped" : isPlaying ? "playing" : "paused",
					title: np?.title ?? "",
					artists: np?.artist ?? "",
					img: np?.cover ?? "icon",
					albumUrl: "",
					artistUrl: "",
					trackId,
					trackUrl,
					nmUGCPlayerUrl: trackId.endsWith("-e")
						? `${window.location.origin}/track?key=${trackId}`
						: np?.directUrl
							? `${window.location.origin}/track?key=${encodeTrackKey({ url: np.directUrl, title: np.title, artist: np.artist, cover: np.cover })}`
							: null,
					positionSec: np ? (audio?.currentTime ?? 0) : 0,
					durationSec:
						np && Number.isFinite(audio?.duration) ? audio?.duration : 0,
				},
				() => {
					if (cleanup) cleanups.delete(cleanup);
				},
			);
			if (cleanup) {
				cleanups.add(cleanup);
			}
		};
		if (!enabled) {
			if (wasEnabled.current) send(true);
			wasEnabled.current = false;
			return () => cleanups.forEach((cleanup) => cleanup());
		}
		wasEnabled.current = true;
		send();
		const audio = audioRef.current;
		const onUpdate = () => send();
		const onExit = () => send(true);
		window.addEventListener("pagehide", onExit);
		audio?.addEventListener("loadedmetadata", onUpdate);
		audio?.addEventListener("seeked", onUpdate);
		const timer =
			nowPlaying && isPlaying ? setInterval(onUpdate, RESYNC_MS) : null;
		return () => {
			if (timer !== null) clearInterval(timer);
			window.removeEventListener("pagehide", onExit);
			audio?.removeEventListener("loadedmetadata", onUpdate);
			audio?.removeEventListener("seeked", onUpdate);
			cleanups.forEach((cleanup) => cleanup());
		};
	}, [nowPlaying, isPlaying, enabled, audioRef]);
}
