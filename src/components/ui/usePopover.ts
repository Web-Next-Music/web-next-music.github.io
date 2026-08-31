"use client";

import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type RefObject,
} from "react";

export interface PopoverOptions {
	align?: "start" | "end";
	side?: "top" | "bottom";
	offset?: number;
	minWidth?: number;
	matchAnchorWidth?: boolean;
}

export function usePopover(
	anchorRef: RefObject<HTMLElement | null>,
	open: boolean,
	onClose: () => void,
	options: PopoverOptions = {},
) {
	const {
		align = "start",
		side = "bottom",
		offset = 6,
		minWidth,
		matchAnchorWidth = false,
	} = options;

	const floatingRef = useRef<HTMLElement | null>(null);
	const onCloseRef = useRef(onClose);

	useEffect(() => {
		onCloseRef.current = onClose;
	}, [onClose]);
	const [style, setStyle] = useState<CSSProperties>({
		position: "fixed",
		top: 0,
		left: 0,
		visibility: "hidden",
	});

	const update = useCallback(() => {
		const anchor = anchorRef.current;
		if (!anchor) return;

		const rect = anchor.getBoundingClientRect();
		const floating = floatingRef.current;
		const width = floating?.offsetWidth ?? minWidth ?? rect.width;
		const height = floating?.offsetHeight ?? 0;

		const spaceBelow = window.innerHeight - rect.bottom;
		const flip = side === "top" || (height > 0 && spaceBelow < height + offset);

		const top = flip ? rect.top - height - offset : rect.bottom + offset;
		let left = align === "end" ? rect.right - width : rect.left;
		left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

		setStyle({
			position: "fixed",
			top: Math.max(8, top),
			left,
			minWidth: matchAnchorWidth ? rect.width : minWidth,
			visibility: "visible",
		});
	}, [anchorRef, align, side, offset, minWidth, matchAnchorWidth]);

	useEffect(() => {
		if (!open) return;

		update();
		const raf = requestAnimationFrame(update);

		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, true);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, [open, update]);

	useEffect(() => {
		if (!open) return;

		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as Node;
			if (
				anchorRef.current?.contains(target) ||
				floatingRef.current?.contains(target)
			)
				return;
			onCloseRef.current();
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCloseRef.current();
		};

		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open, anchorRef]);

	return { style, floatingRef };
}

export default usePopover;
