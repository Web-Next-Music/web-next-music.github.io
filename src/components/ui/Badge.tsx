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
	const tones: Record<BadgeTone, string> = {
		accent: styles.accent,
		neutral: styles.neutral,
		danger: styles.danger,
		warning: styles.warning,
		success: styles.success,
	};
	const variants: Record<BadgeVariant, string> = {
		soft: styles.softLayout,
		solid: styles.solidStyle,
		outline: styles.softLayout2,
	};
	const sizes: Record<BadgeSize, string> = {
		xs: styles["size-xsLayout"],
		sm: styles["size-smLayout"],
		md: styles["size-mdLayout"],
	};
	return (
		<span
			className={cx(
				styles.baseLayout,
				tones[tone],
				variants[variant],
				sizes[size],
				className,
			)}
			{...rest}
		>
			{children}
		</span>
	);
}
