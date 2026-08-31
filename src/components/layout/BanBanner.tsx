"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import styles from "./BanBanner.module.scss";

export default function BanBanner() {
	const { isBanned } = useAuth();
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (el) {
			document.documentElement.style.setProperty(
				"--ban-banner-h",
				`${el.offsetHeight}px`,
			);
		}
		return () => {
			document.documentElement.style.removeProperty("--ban-banner-h");
		};
	}, [isBanned]);

	if (!isBanned) return null;

	return (
		<>
			<div ref={ref} className={styles.banner}>
				Your account has been banned
			</div>
			<div className={styles.spacer} />
		</>
	);
}
