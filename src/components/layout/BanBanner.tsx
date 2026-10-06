"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";

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
			<div
				ref={ref}
				className={
					"fixed left-0 right-0 top-0 z-(--z-banner) [background:var(--danger)] text-white text-center p-[var(--space-2)_var(--space-4)] [font-size:var(--fs-sm)] font-medium leading-[1.4]"
				}
			>
				Your account has been banned
			</div>
			<div className={"h-(--ban-banner-h,0px)"} />
		</>
	);
}
