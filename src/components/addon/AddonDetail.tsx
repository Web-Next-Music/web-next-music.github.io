"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
		exts.find((e) => e.name.toLowerCase().replace(/\s+/g, "-") === needle) ??
		exts.find((e) => e.name.toLowerCase().includes(needle)) ??
		null
	);
}

export default function AddonDetail() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const name = searchParams.get("name");

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
