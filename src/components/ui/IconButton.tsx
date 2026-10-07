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
	const variants: Record<IconButtonVariant, string> = {
		ghost: styles.ghostStyle,
		surface: styles.surfaceLayout,
		danger: styles.dangerStyle,
	};
	const sizes: Record<IconButtonSize, string> = {
		sm: styles["size-sm"],
		md: styles["size-md"],
		lg: styles["size-lg"],
	};
	return (
		<button
			type={type}
			aria-label={label}
			title={label}
			className={cx(
				styles.containerLayout,
				active ? styles.activeLayout : variants[variant],
				sizes[size],
				className,
			)}
			{...rest}
		>
			{children}
		</button>
	);
}
