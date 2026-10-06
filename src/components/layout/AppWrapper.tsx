"use client";

import { useEffect, useRef } from "react";

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
		<div
			ref={ref}
			data-app-scroll
			className={
				"fixed left-0 top-0 w-full overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]"
			}
		>
			{children}
		</div>
	);
}
