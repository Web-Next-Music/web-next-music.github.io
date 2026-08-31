"use client";

import {
	cloneElement,
	useEffect,
	useRef,
	useState,
	type ReactElement,
	type ReactNode,
	type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/useIsClient";
import { usePopover, type PopoverOptions } from "./usePopover";
import styles from "./Tooltip.module.scss";

interface Props extends PopoverOptions {
	content: ReactNode;
	children: ReactElement<{ ref?: unknown }>;
	delay?: number;
	disabled?: boolean;
}

export default function Tooltip({
	content,
	children,
	delay = 400,
	disabled = false,
	...popoverOptions
}: Props) {
	const anchorRef = useRef<HTMLElement | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [open, setOpen] = useState(false);
	const mounted = useIsClient();

	const { style, floatingRef } = usePopover(
		anchorRef,
		open,
		() => setOpen(false),
		popoverOptions,
	);

	useEffect(() => {
		const el = anchorRef.current;
		if (!el || disabled) return;

		const show = () => {
			timer.current = setTimeout(() => setOpen(true), delay);
		};
		const hide = () => {
			if (timer.current) clearTimeout(timer.current);
			setOpen(false);
		};

		el.addEventListener("pointerenter", show);
		el.addEventListener("pointerleave", hide);
		el.addEventListener("focus", show);
		el.addEventListener("blur", hide);
		return () => {
			if (timer.current) clearTimeout(timer.current);
			el.removeEventListener("pointerenter", show);
			el.removeEventListener("pointerleave", hide);
			el.removeEventListener("focus", show);
			el.removeEventListener("blur", hide);
		};
	}, [delay, disabled]);

	return (
		<>
			{cloneElement(children, { ref: anchorRef })}
			{mounted &&
				open &&
				createPortal(
					<div
						ref={floatingRef as RefObject<HTMLDivElement>}
						role="tooltip"
						style={style}
						className={styles.tooltip}
					>
						{content}
					</div>,
					document.body,
				)}
		</>
	);
}
