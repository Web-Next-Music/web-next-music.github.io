"use client";

import type { CSSProperties, HTMLAttributes } from "react";
import { cx } from "@/lib/cx";

export type SkeletonVariant = "line" | "block" | "circle";
export type SkeletonRadius = "sm" | "md" | "lg" | "pill" | "full";
export type SkeletonAnimation = "pulse" | "shimmer" | "none";

interface Props extends HTMLAttributes<HTMLDivElement> {
	variant?: SkeletonVariant;
	width?: number | string;
	height?: number | string;
	radius?: SkeletonRadius;
	animation?: SkeletonAnimation;
}

export default function Skeleton({
	variant = "line",
	width,
	height,
	radius,
	animation = "pulse",
	className,
	style,
	...rest
}: Props) {
	const variants: Record<SkeletonVariant, string> = {
		line: "h-3 w-full",
		block: "h-20 w-full",
		circle: "size-9",
	};
	const radii: Record<SkeletonRadius, string> = {
		sm: "rounded-xs",
		md: "rounded-md",
		lg: "rounded-lg",
		pill: "rounded-full",
		full: "rounded-full",
	};
	const animations: Record<SkeletonAnimation, string> = {
		none: "",
		pulse: "animate-[nm-pulse_1.4s_var(--ease-in-out)_infinite]",
		shimmer:
			"animate-[nm-shimmer_1.4s_linear_infinite] bg-[linear-gradient(90deg,var(--surface)_25%,var(--surface2)_50%,var(--surface)_75%)] bg-[length:200%_100%]",
	};
	const resolvedRadius = radius ?? (variant === "circle" ? "full" : "sm");
	const sizeStyle: CSSProperties = { ...style };
	if (width !== undefined) sizeStyle.width = width;
	if (height !== undefined) sizeStyle.height = height;

	return (
		<div
			aria-hidden="true"
			className={cx(
				"bg-surface-raised",
				variants[variant],
				radii[resolvedRadius],
				animations[animation],
				className,
			)}
			style={sizeStyle}
			{...rest}
		/>
	);
}

export function SkeletonText({
	lines = 3,
	className,
}: {
	lines?: number;
	className?: string;
}) {
	return (
		<div className={cx("flex flex-col gap-2", className)}>
			{Array.from({ length: lines }, (_, i) => (
				<Skeleton
					key={i}
					variant="line"
					width={i === lines - 1 ? "60%" : "100%"}
				/>
			))}
		</div>
	);
}
