"use client";
import React, {
	useState,
	useEffect,
	useLayoutEffect,
	useCallback,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
	getCachedData,
	saveToCache,
	refreshCacheTimestamp,
	cacheMatchesNewData,
} from "@/lib/addons/addonCache";
import type { Extension } from "@/lib/addons/addonCache";
import { loadExtensions } from "@/lib/addons/extensionLoader";
import { ExtensionPage } from "@/components/store/ExtensionPage";
import styles from "../store/StoreFeed.module.scss";

function resolveSlug(slug: string, exts: Extension[]): Extension | null {
	if (!slug) return null;
	const needle = slug.toLowerCase();
	return (
		exts.find((e) => e.name.toLowerCase() === needle) ??
		exts.find((e) => e.name.toLowerCase().replace(/\s+/g, "-") === needle) ??
		exts.find((e) => e.name.toLowerCase().includes(needle)) ??
		null
	);
}

export default function AddonDetail({
	nameOverride,
}: {
	nameOverride?: string;
} = {}) {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const router = useRouter();
	// Resolve the addon name from the override (404 fallback), the ?name= query,
	// or a prettified /addon/<name> path.
	const name =
		nameOverride ??
		searchParams.get("name") ??
		(pathname?.match(/^\/addon\/(.+?)\/?$/)?.[1]
			? decodeURIComponent(pathname.match(/^\/addon\/(.+?)\/?$/)![1])
			: null);

	const [extension, setExtension] = useState<Extension | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadingMsg, setLoadingMsg] = useState("Loading addon…");
	const [error, setError] = useState<string | null>(null);

	const loadAddon = useCallback(async () => {
		if (!name) {
			setLoading(false);
			setError("No addon name provided. Use ?name=xxx");
			return;
		}

		setLoading(true);
		setError(null);

		const cached = getCachedData();

		if (cached.exts && !cached.needsRefresh) {
			const found = resolveSlug(name, cached.exts);
			if (found) {
				setExtension(found);
				setLoading(false);
				return;
			}
		}

		try {
			setLoadingMsg("Connecting to GitHub…");
			const freshExts = await loadExtensions(setLoadingMsg);

			if (cached.exts && cacheMatchesNewData(freshExts)) {
				refreshCacheTimestamp();
				const found = resolveSlug(name, cached.exts!);
				if (found) {
					setExtension(found);
					setLoading(false);
					return;
				}
			}

			saveToCache(freshExts);

			const found = resolveSlug(name, freshExts);
			if (found) {
				setExtension(found);
			} else {
				setError(`Addon "${name}" not found`);
			}
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Unknown error";
			if (cached.exts) {
				const found = resolveSlug(name, cached.exts);
				if (found) {
					setExtension(found);
					console.warn(
						"[AddonDetail] Using cached data (GitHub API unavailable)",
					);
				} else {
					setError(
						`Addon "${name}" not found in cache. GitHub API is currently unavailable.`,
					);
				}
			} else {
				setError(
					`Failed to load extensions: ${msg}. GitHub API is currently unavailable.`,
				);
			}
		} finally {
			setLoading(false);
		}
	}, [name]);

	useEffect(() => {
		loadAddon();
	}, [loadAddon]);

	// Once resolved, rewrite the address bar to the clean /addon/<name> path
	// (using the real addon name) without a navigation, so in-app soft-navigation
	// stays client-side while showing a pretty URL. Hard loads of /addon/<name>
	// are served by the 404.html fallback (UserProfileRouter).
	useLayoutEffect(() => {
		if (typeof window === "undefined") return;
		if (nameOverride || !extension) return;
		if (window.location.pathname !== "/addon") return;
		window.history.replaceState(
			null,
			"",
			`/addon/${encodeURIComponent(extension.name)}`,
		);
	}, [extension, nameOverride]);

	const handleBack = useCallback(() => {
		router.push("/store");
	}, [router]);

	if (loading) {
		return (
			<div className={styles.loadingPage}>
				<div className={styles.loadingPageContent}>
					<span className={styles.spinner} />
					<p>{loadingMsg}</p>
				</div>
			</div>
		);
	}

	if (error || !extension) {
		return (
			<div className={styles.root}>
				<div className={styles.notFound}>
					<div className={styles.notFoundCode}>404</div>
					<div className={styles.notFoundTitle}>Addon not found</div>
					<div className={styles.notFoundSub}>
						{error ?? (
							<>
								No addon matched <code>{name}</code>
							</>
						)}
					</div>
					<button
						className={`${styles.btn} ${styles.btnPrimary}`}
						onClick={handleBack}
					>
						Back to Store
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.root}>
			<ExtensionPage ext={extension} onBack={handleBack} />
		</div>
	);
}
