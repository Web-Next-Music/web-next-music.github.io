import { useState, useEffect, useRef } from "react";
import type { Extension } from "@/types/addon";

export function extSlug(ext: Extension) {
	return ext.name.toLowerCase().replace(/\s+/g, "-");
}

function navigate(path: string) {
	window.history.pushState(null, "", path);
}

function resolveSlug(slug: string, exts: Extension[]): Extension | null {
	if (!slug) return null;
	const needle = slug.toLowerCase();
	return (
		exts.find((e) => extSlug(e) === needle) ??
		exts.find((e) => e.name.toLowerCase().includes(needle)) ??
		null
	);
}

export function useStoreNavigation(extensions: Extension[]) {
	const [selectedExt, setSelectedExt] = useState<Extension | null>(null);
	const [hashNotFound, setHashNotFound] = useState<string | null>(null);

	const initialSlugRef = useRef<string | null>(null);
	const initialWasHashRef = useRef(false);
	const isFirstRender = useRef(true);

	useEffect(() => {
		const hash = window.location.hash.slice(1).trim();
		if (hash) {
			initialSlugRef.current = hash;
			initialWasHashRef.current = true;
			return;
		}
		const segs = window.location.pathname.split("/").filter(Boolean);
		initialSlugRef.current = segs[segs.length - 1] || null;
		initialWasHashRef.current = false;
	}, []);

	useEffect(() => {
		if (!extensions.length) return;
		if (initialSlugRef.current) {
			const slug = initialSlugRef.current;
			const wasHash = initialWasHashRef.current;
			initialSlugRef.current = null;
			const found = resolveSlug(slug, extensions);
			if (found) {
				setHashNotFound(null);
				setSelectedExt(found);
				if (wasHash) navigate(`/store/${extSlug(found)}`);
			} else if (wasHash) {
				setHashNotFound(slug);
			}
		}
	}, [extensions]);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		if (selectedExt) {
			navigate(`/store/${extSlug(selectedExt)}`);
		} else {
			const segs = window.location.pathname.split("/").filter(Boolean);
			const withoutSlug = segs.filter(
				(s) => !extensions.some((e) => extSlug(e) === s),
			);
			navigate(withoutSlug.length ? `/${withoutSlug.join("/")}` : "/");
		}
	}, [selectedExt]);

	useEffect(() => {
		const handler = () => {
			const segs = window.location.pathname.split("/").filter(Boolean);
			const slug = segs[segs.length - 1];
			if (!slug || !extensions.length) {
				setSelectedExt(null);
				return;
			}
			const found = extensions.find((e) => extSlug(e) === slug);
			setSelectedExt(found ?? null);
		};
		window.addEventListener("popstate", handler);
		return () => window.removeEventListener("popstate", handler);
	}, [extensions]);

	useEffect(() => {
		if (!extensions.length) return;
		const handler = () => {
			const hash = window.location.hash.slice(1).trim();
			if (!hash) return;
			const found = resolveSlug(hash, extensions);
			if (found) {
				setHashNotFound(null);
				setSelectedExt(found);
				navigate(`/store/${extSlug(found)}`);
			} else {
				setHashNotFound(hash);
				setSelectedExt(null);
			}
		};
		window.addEventListener("hashchange", handler);
		return () => window.removeEventListener("hashchange", handler);
	}, [extensions]);

	return { selectedExt, setSelectedExt, hashNotFound, setHashNotFound };
}
