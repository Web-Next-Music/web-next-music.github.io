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
	return (
		<div
			role="separator"
			aria-orientation={orientation}
			className={cx(styles[orientation], styles[`gap-${spacing}`], className)}
			{...rest}
		/>
	);
}
