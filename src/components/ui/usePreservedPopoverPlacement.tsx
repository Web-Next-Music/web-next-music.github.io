"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

interface Options {
	open: boolean;
	anchorRef: RefObject<HTMLElement | null>;
	viewportRef?: RefObject<HTMLElement | null>;
	align: "start" | "end";
	side?: "top" | "bottom";
	offset: number;
}

export function usePreservedPopoverPlacement({
	open,
	anchorRef,
	viewportRef,
	align,
	side = "bottom",
	offset,
}: Options) {
	const [content, setContent] = useState<HTMLElement | null>(null);
	const [correction, setCorrection] = useState({ x: 0, y: 0 });

	useLayoutEffect(() => {
		const anchor = anchorRef.current;
		const wrapper = content?.parentElement;
		if (
			!open ||
			!anchor ||
			!content ||
			!wrapper?.hasAttribute("data-radix-popper-content-wrapper")
		)
			return;
		const viewport = viewportRef?.current ?? content;
		const update = () => {
			if (wrapper.style.transform === "translate(0, -200%)") return;
			const rect = anchor.getBoundingClientRect();
			const placed = wrapper.getBoundingClientRect();
			const width = viewport.offsetWidth;
			const height = viewport.offsetHeight;
			const left = Math.max(
				8,
				Math.min(
					align === "end" ? rect.right - width : rect.left,
					window.innerWidth - width - 8,
				),
			);
			const above =
				side === "top" || window.innerHeight - rect.bottom < height + offset;
			const top = Math.max(
				8,
				above ? rect.top - height - offset : rect.bottom + offset,
			);
			const next = { x: left - placed.left, y: top - placed.top };
			setCorrection((previous) =>
				Math.abs(next.x - previous.x) < 0.001 &&
				Math.abs(next.y - previous.y) < 0.001
					? previous
					: next,
			);
		};
		const mutation = new MutationObserver(update);
		mutation.observe(wrapper, { attributes: true, attributeFilter: ["style"] });
		const resize = new ResizeObserver(update);
		resize.observe(anchor);
		resize.observe(viewport);
		let frame = 0;
		const onScroll = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(update);
		};
		window.addEventListener("scroll", onScroll, true);
		window.addEventListener("resize", update);
		update();
		return () => {
			mutation.disconnect();
			resize.disconnect();
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", update);
		};
	}, [open, content, anchorRef, viewportRef, align, side, offset]);

	return { ref: setContent, translate: `${correction.x}px ${correction.y}px` };
}
