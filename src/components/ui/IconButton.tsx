"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { cx } from "@/lib/cx";
import styles from "./IconButton.module.scss";

export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonVariant = "ghost" | "surface" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
	label: string;
	size?: IconButtonSize;
	variant?: IconButtonVariant;
	active?: boolean;
	ref?: Ref<HTMLButtonElement>;
}

export default function IconButton({
	label,
	size = "md",
	variant = "ghost",
	active = false,
	className,
	type = "button",
	children,
	...rest
}: Props) {
	return (
		<button
			type={type}
			aria-label={label}
			title={label}
			className={cx(
				styles.base,
				styles[variant],
				styles[`size-${size}`],
				active && styles.active,
				className,
			)}
			{...rest}
		>
			{children}
		</button>
	);
}
