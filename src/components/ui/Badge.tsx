"use client";

import type { HTMLAttributes, Ref } from "react";
import { cx } from "@/lib/cx";

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
		accent:
			"[--badge-color:var(--accent)] [--badge-surface:var(--accent-surface)] [--badge-border:var(--accent-border)]",
		neutral:
			"[--badge-color:var(--muted)] [--badge-surface:var(--surface2)] [--badge-border:var(--border)]",
		danger:
			"[--badge-color:var(--danger)] [--badge-surface:var(--danger-surface-strong)] [--badge-border:var(--danger-border)]",
		warning:
			"[--badge-color:var(--warning)] [--badge-surface:var(--warning-surface-strong)] [--badge-border:var(--warning-border)]",
		success:
			"[--badge-color:var(--success)] [--badge-surface:var(--success-surface-strong)] [--badge-border:var(--success-border)]",
	};
	const variants: Record<BadgeVariant, string> = {
		soft: "border-[var(--badge-border)] bg-[var(--badge-surface)] text-[var(--badge-color)]",
		solid: "bg-[var(--badge-color)] text-canvas",
		outline:
			"border-[var(--badge-border)] bg-transparent text-[var(--badge-color)]",
	};
	const sizes: Record<BadgeSize, string> = {
		xs: "px-1.5 py-px text-[var(--fs-2xs)]",
		sm: "px-2 py-0.5 text-[var(--fs-xs)]",
		md: "px-2.5 py-[3px] text-[var(--fs-sm)]",
	};
	return (
		<span
			className={cx(
				"inline-flex items-center gap-1 rounded-3xl border border-transparent leading-[1.4] whitespace-nowrap",
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
