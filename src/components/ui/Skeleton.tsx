"use client";

import type { CSSProperties, HTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import styles from "./Skeleton.module.scss";

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
	const resolvedRadius = radius ?? (variant === "circle" ? "full" : "sm");
	const sizeStyle: CSSProperties = { ...style };
	if (width !== undefined) sizeStyle.width = width;
	if (height !== undefined) sizeStyle.height = height;

	return (
		<div
			aria-hidden="true"
			className={cx(
				styles.base,
				styles[variant],
				styles[`radius-${resolvedRadius}`],
				styles[`anim-${animation}`],
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
		<div className={cx(styles.text, className)}>
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
