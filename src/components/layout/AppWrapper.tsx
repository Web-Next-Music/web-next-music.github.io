"use client";

import { useEffect, useRef } from "react";
import styles from "./AppWrapper.module.scss";

export function AppWrapper({ children }: { children: React.ReactNode }) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const lockHeight = () => {
			el.style.height = `${window.innerHeight}px`;
		};

		lockHeight();

		const onOrientationChange = () => setTimeout(lockHeight, 300);
		screen.orientation?.addEventListener("change", onOrientationChange);
		return () =>
			screen.orientation?.removeEventListener("change", onOrientationChange);
	}, []);

	return (
		<div ref={ref} data-app-scroll className={styles.wrapper}>
			{children}
		</div>
	);
}
