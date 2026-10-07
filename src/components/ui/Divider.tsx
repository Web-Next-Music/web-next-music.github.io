"use client";

import type { HTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import styles from "./Divider.module.scss";

export type DividerSpacing = "none" | "sm" | "md" | "lg";

interface Props extends HTMLAttributes<HTMLDivElement> {
	orientation?: "horizontal" | "vertical";
	spacing?: DividerSpacing;
}

export default function Divider({
	orientation = "horizontal",
	spacing = "md",
	className,
	...rest
}: Props) {
	const spacingClasses: Record<DividerSpacing, string> = {
		none: styles["gap-none"],
		sm: orientation === "horizontal" ? styles.smStyle : styles.smStyle2,
		md: orientation === "horizontal" ? styles.mdStyle : styles.mdStyle2,
		lg: orientation === "horizontal" ? styles.lgStyle : styles.lgStyle2,
	};
	return (
		<div
			role="separator"
			aria-orientation={orientation}
			className={cx(
				styles.elementStyle,
				orientation === "horizontal"
					? styles.horizontalLayout
					: styles.verticalLayout,
				spacingClasses[spacing],
				className,
			)}
			{...rest}
		/>
	);
}
