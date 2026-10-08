import {
	LEGACY_URL,
	TRACK_META,
	parseLegacy,
	type LegacyTrack,
	type TrackMeta,
} from "@/lib/fckcensor";
import type {
	CachedTrack,
	StoreSnapshot as BaseStoreSnapshot,
} from "@/types/track";

export type { CachedTrack };
export type StoreSnapshot = BaseStoreSnapshot & {
	loading: boolean;
	error: string | null;
};

let legacy: LegacyTrack[] = [];
let loaded = false;
let loading = false;
let error: string | null = null;
let promise: Promise<void> | null = null;
const tracksById = new Map<string, CachedTrack>();
const listeners = new Set<() => void>();

let snapshot: StoreSnapshot = { legacy, loaded, loading, error };

function notify() {
	snapshot = { legacy, loaded, loading, error };
	listeners.forEach((fn) => fn());
}

export function subscribeStore(fn: () => void): () => void {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

export function getStoreSnapshot(): StoreSnapshot {
	return snapshot;
}

const SERVER_SNAPSHOT: StoreSnapshot = {
	legacy: [],
	loaded: false,
	loading: false,
	error: null,
};
export function getServerSnapshot(): StoreSnapshot {
	return SERVER_SNAPSHOT;
}

export function ensureTracksLoaded(): Promise<void> {
	if (loaded) return Promise.resolve();
	if (promise) return promise;

	loading = true;
	error = null;
	promise = fetch(LEGACY_URL)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`Track list request failed (${response.status})`);
			}
			return response.json();
		})
		.then(parseLegacy)
		.then((tracks) => {
			legacy = tracks;
			tracksById.clear();
			for (const track of tracks) {
				const meta = (TRACK_META[track.id] ?? null) as TrackMeta | null;
				tracksById.set(track.id, {
					id: track.id,
					url: track.url,
					title: meta?.title || `Track #${track.id}`,
					artist: meta?.artist || "",
					cover: meta?.cover,
					yandexUrl: track.yandexUrl,
				});
			}
			loaded = true;
		})
		.catch((cause: unknown) => {
			error = cause instanceof Error ? cause.message : "Failed to load tracks";
		})
		.finally(() => {
			loading = false;
			promise = null;
			notify();
		});
	notify();
	return promise;
}

export function retryTracksLoaded(): Promise<void> {
	return ensureTracksLoaded();
}

export function findTrackById(id: string): CachedTrack | null {
	return tracksById.get(id) ?? null;
}
