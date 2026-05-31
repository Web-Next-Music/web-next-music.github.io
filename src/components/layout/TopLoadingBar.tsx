"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./TopLoadingBar.module.scss";

function TopLoadingBarInner() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [progress, setProgress] = useState(0);
	const [visible, setVisible] = useState(false);
	const [instant, setInstant] = useState(false);

	const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const navKeyRef = useRef("");
	const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const runningRef = useRef(false);
	const rafRef = useRef<number | null>(null);
	const startRef = useRef<() => void>(() => {});
	const doneRef = useRef<() => void>(() => {});

	useEffect(() => {
		const clearTrickle = () => {
			if (trickleRef.current) {
				clearInterval(trickleRef.current);
				trickleRef.current = null;
			}
		};

		const start = () => {
			if (doneTimerRef.current) {
				clearTimeout(doneTimerRef.current);
				doneTimerRef.current = null;
			}
			clearTrickle();
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
			setVisible(true);
			if (!runningRef.current) {
				runningRef.current = true;
				setInstant(true);
				setProgress(0);
				rafRef.current = requestAnimationFrame(() => {
					rafRef.current = null;
					setInstant(false);
					setProgress(8);
				});
			}
			trickleRef.current = setInterval(() => {
				setProgress((p) => {
					if (p >= 90) return p;
					const step = (90 - p) * 0.12 + 0.4;
					return Math.min(90, p + step);
				});
			}, 180);
			if (watchdogRef.current) clearTimeout(watchdogRef.current);
			watchdogRef.current = setTimeout(() => doneRef.current(), 8000);
		};

		const done = () => {
			if (!runningRef.current) return;
			runningRef.current = false;
			if (watchdogRef.current) {
				clearTimeout(watchdogRef.current);
				watchdogRef.current = null;
			}
			clearTrickle();
			setProgress(100);
			doneTimerRef.current = setTimeout(() => {
				setVisible(false);
				doneTimerRef.current = setTimeout(() => {
					setInstant(true);
					setProgress(0);
				}, 250);
			}, 200);
		};

		startRef.current = start;
		doneRef.current = done;

		return () => {
			clearTrickle();
			if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
			if (watchdogRef.current) clearTimeout(watchdogRef.current);
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
		};
	}, []);

	useEffect(() => {
		const start = () => startRef.current();

		let onLoad: (() => void) | null = null;
		if (document.readyState !== "complete") {
			const startedAt = Date.now();
			start();
			onLoad = () => {
				const elapsed = Date.now() - startedAt;
				const remaining = Math.max(0, 300 - elapsed);
				setTimeout(() => doneRef.current(), remaining);
			};
			window.addEventListener("load", onLoad, { once: true });
		}

		const onPopState = () => {
			const key = `${location.pathname}?${location.search.replace(/^\?/, "")}`;
			if (key === navKeyRef.current) return;
			start();
		};
		window.addEventListener("popstate", onPopState);

		const patch = <K extends "pushState" | "replaceState">(name: K) => {
			const original = history[name];
			history[name] = function (
				this: History,
				...args: Parameters<History[K]>
			) {
				let changed = false;
				const url = args[2];
				if (url != null) {
					try {
						const dest = new URL(String(url), location.href);
						changed =
							dest.pathname !== location.pathname ||
							dest.search !== location.search;
					} catch {}
				}
				const result = original.apply(this, args as never);
				if (changed) queueMicrotask(start);
				return result;
			} as History[K];
			return () => {
				history[name] = original;
			};
		};
		const unpatchPush = patch("pushState");
		const unpatchReplace = patch("replaceState");

		const onClick = (e: MouseEvent) => {
			if (e.defaultPrevented || e.button !== 0) return;
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			const anchor = (e.target as HTMLElement | null)?.closest("a");
			if (!anchor) return;
			const href = anchor.getAttribute("href");
			if (!href || href.startsWith("#")) return;
			if (anchor.target && anchor.target !== "_self") return;
			if (anchor.hasAttribute("download")) return;
			try {
				const dest = new URL(anchor.href, location.href);
				if (dest.origin !== location.origin) return;
				if (
					dest.pathname === location.pathname &&
					dest.search === location.search
				)
					return;
				start();
			} catch {}
		};
		document.addEventListener("click", onClick, true);

		return () => {
			if (onLoad) window.removeEventListener("load", onLoad);
			window.removeEventListener("popstate", onPopState);
			document.removeEventListener("click", onClick, true);
			unpatchPush();
			unpatchReplace();
		};
	}, []);

	useEffect(() => {
		const key = `${pathname}?${searchParams?.toString() ?? ""}`;
		if (navKeyRef.current && navKeyRef.current !== key) {
			doneRef.current();
		}
		navKeyRef.current = key;
	}, [pathname, searchParams]);

	return (
		<div
			className={`${styles.bar} ${visible ? styles.active : ""} ${
				instant ? styles.instant : ""
			}`}
			style={{ width: `${progress}%` }}
			role="progressbar"
			aria-hidden="true"
		/>
	);
}

export default function TopLoadingBar() {
	return (
		<Suspense fallback={null}>
			<TopLoadingBarInner />
		</Suspense>
	);
}
