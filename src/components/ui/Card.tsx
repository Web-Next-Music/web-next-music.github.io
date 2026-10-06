"use client";

import type { ElementType, HTMLAttributes, Ref } from "react";
import { cx } from "@/lib/cx";

export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardRadius = "md" | "lg" | "xl";
export type CardTone = "surface" | "raised";

interface Props extends HTMLAttributes<HTMLDivElement> {
	as?: "div" | "section" | "article" | "li";
	padding?: CardPadding;
	radius?: CardRadius;
	tone?: CardTone;
	interactive?: boolean;
	ref?: Ref<HTMLDivElement>;
}

export default function Card({
	as = "div",
	padding = "md",
	radius = "lg",
	tone = "surface",
	interactive = false,
	className,
	children,
	...rest
}: Props) {
	const Tag = as as ElementType;
	const paddingClasses: Record<CardPadding, string> = {
		none: "p-0",
		sm: "p-3",
		md: "p-4",
		lg: "p-5",
	};
	const radiusClasses: Record<CardRadius, string> = {
		md: "rounded-md",
		lg: "rounded-lg",
		xl: "rounded-2xl",
	};

	return (
		<Tag
			className={cx(
				"border border-border",
				paddingClasses[padding],
				radiusClasses[radius],
				tone === "raised" ? "bg-surface-raised" : "bg-surface",
				interactive &&
					"transition-colors hover:border-(--accent-border) hover:bg-surface-raised",
				className,
			)}
			{...rest}
		>
			{children}
		</Tag>
	);
}

export function CardHeader({
	className,
	...rest
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cx("mb-3 flex items-center justify-between gap-3", className)}
			{...rest}
		/>
	);
}

export function CardTitle({
	className,
	...rest
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cx("text-(length:--fs-lg) text-foreground", className)}
			{...rest}
		/>
	);
}

export function CardBody({
	className,
	...rest
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cx("text-(length:--fs-sm) text-muted", className)}
			{...rest}
		/>
	);
}

export function CardFooter({
	className,
	...rest
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={cx("mt-4 flex items-center gap-2", className)} {...rest} />
	);
}
