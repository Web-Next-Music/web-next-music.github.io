"use client";

import {
	useCallback,
	useLayoutEffect,
	useRef,
	type ChangeEvent,
	type Ref,
	type TextareaHTMLAttributes,
} from "react";
import { cx } from "@/lib/cx";
import styles from "./Textarea.module.scss";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
	invalid?: boolean;
	autoGrow?: boolean;
	ref?: Ref<HTMLTextAreaElement>;
}

export default function Textarea({
	invalid = false,
	autoGrow = false,
	className,
	style,
	onChange,
	ref,
	...rest
}: Props) {
	const elementRef = useRef<HTMLTextAreaElement | null>(null);
	const resize = useCallback(() => {
		const element = elementRef.current;
		if (!autoGrow || !element || !element.getClientRects().length) return;
		const computed = getComputedStyle(element);
		const padding =
			parseFloat(computed.paddingTop) + parseFloat(computed.paddingBottom);
		const border =
			parseFloat(computed.borderTopWidth) +
			parseFloat(computed.borderBottomWidth);
		element.style.height = "auto";
		element.style.height = `${element.scrollHeight + (computed.boxSizing === "border-box" ? border : -padding)}px`;
	}, [autoGrow]);

	const setRef = useCallback(
		(element: HTMLTextAreaElement | null) => {
			elementRef.current = element;
			if (typeof ref === "function") return ref(element);
			if (ref) ref.current = element;
		},
		[ref],
	);

	useLayoutEffect(() => {
		resize();
	});

	useLayoutEffect(() => {
		const element = elementRef.current;
		if (!autoGrow || !element) return;
		const previousHeight = style?.height;
		let width = element.getBoundingClientRect().width;
		const observer = new ResizeObserver(() => {
			const nextWidth = element.getBoundingClientRect().width;
			if (nextWidth !== width) {
				width = nextWidth;
				resize();
			}
		});
		observer.observe(element);
		resize();
		let resetFrame = 0;
		const onReset = () => {
			cancelAnimationFrame(resetFrame);
			resetFrame = requestAnimationFrame(resize);
		};
		element.form?.addEventListener("reset", onReset);
		let active = true;
		void document.fonts.ready.then(() => {
			if (active) resize();
		});
		window.addEventListener("resize", resize);
		document.fonts.addEventListener("loadingdone", resize);
		return () => {
			active = false;
			cancelAnimationFrame(resetFrame);
			observer.disconnect();
			element.form?.removeEventListener("reset", onReset);
			window.removeEventListener("resize", resize);
			document.fonts.removeEventListener("loadingdone", resize);
			element.style.height =
				previousHeight === undefined
					? ""
					: typeof previousHeight === "number"
						? `${previousHeight}px`
						: previousHeight;
		};
	}, [autoGrow, resize, style?.height]);

	const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		resize();
		onChange?.(event);
	};

	return (
		<textarea
			{...rest}
			ref={setRef}
			aria-invalid={invalid || rest["aria-invalid"] || undefined}
			onChange={handleChange}
			style={{ scrollbarWidth: "thin", ...style }}
			className={cx(
				styles.textareaLayout,
				invalid && styles.invalidLayout,
				autoGrow && styles.autoGrow,
				className,
			)}
		/>
	);
}
