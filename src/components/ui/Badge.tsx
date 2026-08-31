"use client";

import type { HTMLAttributes, Ref } from "react";
import { cx } from "@/lib/cx";
import styles from "./Badge.module.scss";

export type BadgeTone = "accent" | "neutral" | "danger" | "warning" | "success";
export type BadgeVariant = "soft" | "solid" | "outline";
export type BadgeSize = "xs" | "sm" | "md";

interface Props extends HTMLAttributes<HTMLSpanElement> {
	tone?: BadgeTone;
	variant?: BadgeVariant;
	size?: BadgeSize;
	ref?: Ref<HTMLSpanElement>;
}

export default function Badge({
	tone = "accent",
	variant = "soft",
	size = "sm",
	className,
	children,
	...rest
}: Props) {
	return (
		<span
			className={cx(
				styles.base,
				styles[tone],
				styles[variant],
				styles[`size-${size}`],
				className,
			)}
			{...rest}
		>
			{children}
		</span>
	);
}
