"use client";

import {
	useId,
	type ElementType,
	type HTMLAttributes,
	type Ref,
	type ReactNode,
} from "react";
import { cx } from "@/lib/cx";
import styles from "./Card.module.scss";
import modalStyles from "./Modal.module.scss";

export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardRadius = "md" | "lg" | "xl";
export type CardTone = "surface" | "raised";

interface Props extends HTMLAttributes<HTMLDivElement> {
	as?: "div" | "section" | "article" | "li";
	padding?: CardPadding;
	radius?: CardRadius;
	tone?: CardTone;
	interactive?: boolean;
	variant?: "default" | "modal";
	heading?: ReactNode;
	headerActions?: ReactNode;
	ref?: Ref<HTMLDivElement>;
}

export default function Card({
	as = "div",
	padding = "md",
	radius = "lg",
	tone = "surface",
	interactive = false,
	variant = "default",
	heading,
	headerActions,
	className,
	children,
	...rest
}: Props) {
	const headingId = useId();
	const Tag = as as ElementType;
	if (variant === "modal") {
		return (
			<Tag
				className={cx(styles.modalCard, className)}
				aria-labelledby={heading ? headingId : undefined}
				{...rest}
			>
				{(heading || headerActions) && (
					<div className={cx(modalStyles.head, styles.modalHead)}>
						{heading && (
							<h2
								id={headingId}
								className={cx(modalStyles.title, styles.modalHeading)}
							>
								{heading}
							</h2>
						)}
						{headerActions}
					</div>
				)}
				<div className={styles.modalBody}>{children}</div>
			</Tag>
		);
	}
	const paddingClasses: Record<CardPadding, string> = {
		none: styles["pad-none"],
		sm: styles["pad-sm"],
		md: styles["pad-md"],
		lg: styles["pad-lg"],
	};
	const radiusClasses: Record<CardRadius, string> = {
		md: styles.mdStyle,
		lg: styles.lgStyle,
		xl: styles["radius-xl"],
	};

	return (
		<Tag
			className={cx(
				styles.baseLayout,
				paddingClasses[padding],
				radiusClasses[radius],
				tone === "raised" ? styles.elementStyle : styles.elementStyle2,
				interactive && styles.elementStyle3,
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
