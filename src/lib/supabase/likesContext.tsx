"use client";

import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	useCallback,
	type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { decodeTrackKey } from "@/lib/track/trackKey";

export interface TrackLikeMeta {
	title?: string;
	artist?: string;
	cover?: string;
	mp3_url?: string;
}

interface LikesContextValue {
	likedTrackIds: Set<string>;
	likedMeta: Map<string, TrackLikeMeta>;
	toggle: (trackId: string, meta?: TrackLikeMeta) => Promise<void>;
	findLikedByMeta: (title?: string, artist?: string) => string | null;
}

const LikesContext = createContext<LikesContextValue>({
	likedTrackIds: new Set(),
	likedMeta: new Map(),
	toggle: async () => {},
	findLikedByMeta: () => null,
});

export function LikesProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set());
	const [likedMeta, setLikedMeta] = useState<Map<string, TrackLikeMeta>>(
		new Map(),
	);
	const committedIdsRef = useRef<Set<string>>(new Set());
	const pendingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
		new Map(),
	);

	useEffect(() => {
		if (!user) {
			for (const timer of pendingTimersRef.current.values())
				clearTimeout(timer);
			pendingTimersRef.current.clear();
			committedIdsRef.current.clear();
			setLikedTrackIds(new Set());
			setLikedMeta(new Map());
			return;
		}
		const sb = getSupabase();
		if (!sb) return;
		const controller = new AbortController();
		sb.from("track_likes")
			.select("track_id, title, artist, cover, mp3_url")
			.eq("user_id", user.id)
			.abortSignal(controller.signal)
			.then(({ data, error }) => {
				if (error) {
					if (controller.signal.aborted) return;
					console.error("[likes] load error:", error.message);
				}
				if (data) {
					const ids = new Set(data.map((r) => r.track_id as string));
					committedIdsRef.current = new Set(ids);
					setLikedTrackIds(ids);
					const meta = new Map<string, TrackLikeMeta>();
					for (const r of data) {
						const trackId = r.track_id as string;
						let title: string | undefined = r.title ?? undefined;
						let artist: string | undefined = r.artist ?? undefined;
						let cover: string | undefined = r.cover ?? undefined;
						const mp3_url: string | undefined = r.mp3_url ?? undefined;

						if (!title && !artist && !cover && !trackId.startsWith("http")) {
							const decoded = decodeTrackKey(trackId);
							if (decoded) {
								title = decoded.title;
								artist = decoded.artist;
								cover = decoded.cover;
							}
						}

						if (title || artist || cover || mp3_url) {
							meta.set(trackId, { title, artist, cover, mp3_url });
						}
					}
					setLikedMeta(meta);
				}
			});
		return () => controller.abort();
	}, [user?.id]);

	const toggle = useCallback(
		async (trackId: string, meta?: TrackLikeMeta) => {
			if (!user) return;
			const sb = getSupabase();
			if (!sb) return;

			const wasLiked = likedTrackIds.has(trackId);
			const willBeLiked = !wasLiked;

			// Immediate optimistic update
			setLikedTrackIds((prev) => {
				const next = new Set(prev);
				willBeLiked ? next.add(trackId) : next.delete(trackId);
				return next;
			});
			if (willBeLiked && meta) {
				setLikedMeta((prev) => new Map(prev).set(trackId, meta));
			} else if (!willBeLiked) {
				setLikedMeta((prev) => {
					const m = new Map(prev);
					m.delete(trackId);
					return m;
				});
			}

			// Clear any existing pending DB write for this track
			const existing = pendingTimersRef.current.get(trackId);
			if (existing !== undefined) clearTimeout(existing);

			// If toggled back to the committed DB state, no write needed
			if (willBeLiked === committedIdsRef.current.has(trackId)) {
				pendingTimersRef.current.delete(trackId);
				return;
			}

			// Capture data for the debounced DB write
			const capturedMeta = meta;
			const capturedLikedMeta = likedMeta;
			const userId = user.id;

			const timer = setTimeout(async () => {
				pendingTimersRef.current.delete(trackId);

				// Remove stale duplicate likes before inserting a new one
				if (willBeLiked && (capturedMeta?.title || capturedMeta?.artist)) {
					const norm = (s?: string | null) =>
						s?.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim() ?? "";
					const t = norm(capturedMeta?.title);
					const a = norm(capturedMeta?.artist);
					const staleIds: string[] = [];
					for (const [id, m] of capturedLikedMeta) {
						if (id === trackId) continue;
						const titleOk = !t || !m.title || norm(m.title) === t;
						const artistOk = !a || !m.artist || norm(m.artist) === a;
						if (titleOk && artistOk) staleIds.push(id);
					}
					if (staleIds.length > 0) {
						await sb
							.from("track_likes")
							.delete()
							.eq("user_id", userId)
							.in("track_id", staleIds);
						setLikedTrackIds((prev) => {
							const next = new Set(prev);
							for (const id of staleIds) next.delete(id);
							return next;
						});
						setLikedMeta((prev) => {
							const m = new Map(prev);
							for (const id of staleIds) m.delete(id);
							return m;
						});
						for (const id of staleIds) committedIdsRef.current.delete(id);
					}
				}

				const { error } = willBeLiked
					? await sb.from("track_likes").upsert(
							{
								track_id: trackId,
								user_id: userId,
								title: capturedMeta?.title ?? null,
								artist: capturedMeta?.artist ?? null,
								cover: capturedMeta?.cover ?? null,
								mp3_url: capturedMeta?.mp3_url ?? null,
							},
							{ onConflict: "user_id,track_id" },
						)
					: await sb
							.from("track_likes")
							.delete()
							.eq("track_id", trackId)
							.eq("user_id", userId);

				if (!error) {
					if (willBeLiked) committedIdsRef.current.add(trackId);
					else committedIdsRef.current.delete(trackId);
				} else {
					console.error("[likes] toggle error:", error.message);
					// Revert to committed DB state
					const committedLiked = committedIdsRef.current.has(trackId);
					setLikedTrackIds((prev) => {
						const next = new Set(prev);
						committedLiked ? next.add(trackId) : next.delete(trackId);
						return next;
					});
					if (!committedLiked) {
						setLikedMeta((prev) => {
							const m = new Map(prev);
							m.delete(trackId);
							return m;
						});
					}
				}
			}, 400);

			pendingTimersRef.current.set(trackId, timer);
		},
		[user, likedTrackIds, likedMeta],
	);

	const findLikedByMeta = useCallback(
		(title?: string, artist?: string): string | null => {
			if (!title && !artist) return null;
			const norm = (s?: string) =>
				s?.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim() ?? "";
			const t = norm(title);
			const a = norm(artist);
			for (const [trackId, meta] of likedMeta) {
				if (!meta.title && !meta.artist) continue;
				const titleOk = !t || !meta.title || norm(meta.title) === t;
				const artistOk = !a || !meta.artist || norm(meta.artist) === a;
				if (titleOk && artistOk) return trackId;
			}
			return null;
		},
		[likedMeta],
	);

	return (
		<LikesContext.Provider
			value={{ likedTrackIds, likedMeta, toggle, findLikedByMeta }}
		>
			{children}
		</LikesContext.Provider>
	);
}

export function useLikes() {
	return useContext(LikesContext);
}
