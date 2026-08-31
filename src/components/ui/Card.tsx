"use client";

import type { ElementType, HTMLAttributes, Ref } from "react";
import { cx } from "@/lib/cx";
import styles from "./Card.module.scss";

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

	return (
		<Tag
			className={cx(
				styles.base,
				styles[`pad-${padding}`],
				styles[`radius-${radius}`],
				styles[tone],
				interactive && styles.interactive,
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
	return <div className={cx(styles.header, className)} {...rest} />;
}

export function CardTitle({
	className,
	...rest
}: HTMLAttributes<HTMLDivElement>) {
	return <div className={cx(styles.title, className)} {...rest} />;
}

export function CardBody({
	className,
	...rest
}: HTMLAttributes<HTMLDivElement>) {
	return <div className={cx(styles.body, className)} {...rest} />;
}

export function CardFooter({
	className,
	...rest
}: HTMLAttributes<HTMLDivElement>) {
	return <div className={cx(styles.footer, className)} {...rest} />;
}
