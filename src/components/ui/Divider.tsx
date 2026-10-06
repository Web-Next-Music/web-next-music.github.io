"use client";

import type { HTMLAttributes } from "react";
import { cx } from "@/lib/cx";

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
		none: "m-0",
		sm: orientation === "horizontal" ? "my-2" : "mx-2",
		md: orientation === "horizontal" ? "my-4" : "mx-4",
		lg: orientation === "horizontal" ? "my-6" : "mx-6",
	};
	return (
		<div
			role="separator"
			aria-orientation={orientation}
			className={cx(
				"bg-border",
				orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch",
				spacingClasses[spacing],
				className,
			)}
			{...rest}
		/>
	);
}
