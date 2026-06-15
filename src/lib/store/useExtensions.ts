import { useState, useCallback, useRef, useEffect } from "react";
import type { Extension } from "@/types/addon";
import {
	getCachedData,
	saveToCache,
	refreshCacheTimestamp,
	cacheMatchesNewData,
	clearCache,
} from "@/lib/addons/addonCache";
import { loadExtensions } from "@/lib/addons/extensionLoader";

export function useExtensions(
	token: string | null | undefined,
	authLoading: boolean,
) {
	const [extensions, setExtensions] = useState<Extension[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMsg, setLoadingMsg] = useState("Connecting to GitHub…");
	const [error, setError] = useState<string | null>(null);

	const fetchExtensions = useCallback(async (t?: string) => {
		setLoading(true);
		setError(null);
		const cached = getCachedData();
		if (cached.exts && !cached.needsRefresh) {
			setExtensions(cached.exts);
			setLoading(false);
			return;
		}
		try {
			const freshExts = await loadExtensions(setLoadingMsg, t);
			if (cached.exts && cacheMatchesNewData(freshExts)) {
				refreshCacheTimestamp();
				setExtensions(cached.exts);
				setLoading(false);
				return;
			}
			saveToCache(freshExts);
			setExtensions(freshExts);
		} catch (e: unknown) {
			if (cached.exts) {
				setExtensions(cached.exts);
				console.warn("[StoreFeed] Using cached data (GitHub API unavailable)");
			} else {
				setError(e instanceof Error ? e.message : "Failed to load extensions");
			}
		} finally {
			setLoading(false);
		}
	}, []);

	const prevTokenRef = useRef<string | null | undefined>(undefined);

	useEffect(() => {
		if (authLoading) return;
		const prevToken = prevTokenRef.current;
		prevTokenRef.current = token;
		if (prevToken === undefined || (prevToken === null && token !== null)) {
			clearCache();
		}
		fetchExtensions(token ?? undefined);
	}, [authLoading, token, fetchExtensions]);

	return { extensions, loading, loadingMsg, error, fetchExtensions };
}
