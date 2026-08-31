"use client";

import type { CSSProperties, HTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import styles from "./Spinner.module.scss";

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
			className={cx(styles.base, !numeric && styles[`size-${size}`], className)}
			style={sizeStyle}
			{...rest}
		/>
	);
}
