"use client";

import type { CSSProperties, HTMLAttributes } from "react";
import { cx } from "@/lib/cx";

export type SpinnerSize = "sm" | "md" | "lg" | number;

interface Props extends HTMLAttributes<HTMLSpanElement> {
	size?: SpinnerSize;
	label?: string;
}

export default function Spinner({
	size = "md",
	label = "Loading",
	className,
	style,
	...rest
}: Props) {
	const numeric = typeof size === "number";
	const sizeStyle: CSSProperties = numeric
		? { ...style, width: size, height: size }
		: (style ?? {});

	return (
		<span
			role="status"
			aria-label={label}
			className={cx(
				"inline-block shrink-0 animate-spin rounded-full border-2 border-border border-t-accent",
				!numeric && size === "sm" && "size-3",
				!numeric && size === "md" && "size-4",
				!numeric && size === "lg" && "size-6 border-[3px]",
				className,
			)}
			style={sizeStyle}
			{...rest}
		/>
	);
}
