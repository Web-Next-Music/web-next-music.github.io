import { useEffect, useLayoutEffect, useRef } from "react";

export default function useContextMenu<T extends { x: number; y: number }>(
	state: T | null,
	close: () => void,
) {
	const ref = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		if (!state || !ref.current) return;
		const rect = ref.current.getBoundingClientRect();
		ref.current.style.left = `${Math.max(8, Math.min(state.x, window.innerWidth - rect.width - 8))}px`;
		ref.current.style.top = `${Math.max(8, Math.min(state.y, window.innerHeight - rect.height - 8))}px`;
	}, [state]);
	useEffect(() => {
		if (!state) return;
		const outside = (event: MouseEvent) => {
			if (!ref.current?.contains(event.target as Node)) close();
		};
		const key = (event: KeyboardEvent) => {
			if (event.key === "Escape") close();
		};
		document.addEventListener("mousedown", outside);
		document.addEventListener("scroll", close, true);
		document.addEventListener("keydown", key);
		window.addEventListener("resize", close);
		return () => {
			document.removeEventListener("mousedown", outside);
			document.removeEventListener("scroll", close, true);
			document.removeEventListener("keydown", key);
			window.removeEventListener("resize", close);
		};
	}, [state, close]);
	return ref;
}
