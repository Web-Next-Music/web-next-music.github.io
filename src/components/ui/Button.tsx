"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "@/lib/cx";
import Spinner from "./Spinner";
import styles from "./Button.module.scss";

export type ButtonVariant =
	"primary" | "secondary" | "ghost" | "danger" | "pill";
export type ButtonSize = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	loading?: boolean;
	iconLeft?: ReactNode;
	iconRight?: ReactNode;
	fullWidth?: boolean;
	ref?: Ref<HTMLButtonElement>;
}

export default function Button({
	variant = "primary",
	size = "md",
	loading = false,
	iconLeft,
	iconRight,
	fullWidth = false,
	className,
	type = "button",
	disabled,
	children,
	...rest
}: Props) {
	const variants: Record<ButtonVariant, string> = {
		primary: styles.primaryStyle,
		secondary: styles.secondaryLayout,
		ghost: styles.ghostStyle,
		danger: styles.dangerLayout,
		pill: styles.pillLayout,
	};
	const sizes: Record<ButtonSize, string> = {
		sm: styles["size-smLayout"],
		md: styles["size-mdLayout"],
		lg: styles["size-lgLayout"],
	};
	return (
		<button
			type={type}
			disabled={disabled || loading}
			data-loading={loading || undefined}
			className={cx(
				styles.baseLayout,
				variants[variant],
				variant !== "pill" && sizes[size],
				fullWidth && styles.fullWidth,
				className,
			)}
			{...rest}
		>
			{loading && <Spinner size="sm" className={styles.elementStyle} />}
			{iconLeft && <span className={styles.iconLayout}>{iconLeft}</span>}
			{children}
			{iconRight && <span className={styles.iconLayout}>{iconRight}</span>}
		</button>
	);
}
