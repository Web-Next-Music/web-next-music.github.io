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
	return (
		<button
			type={type}
			disabled={disabled || loading}
			data-loading={loading || undefined}
			className={cx(
				styles.base,
				styles[variant],
				styles[`size-${size}`],
				fullWidth && styles.fullWidth,
				className,
			)}
			{...rest}
		>
			{loading && <Spinner size="sm" className={styles.spinner} />}
			{iconLeft && <span className={styles.icon}>{iconLeft}</span>}
			{children}
			{iconRight && <span className={styles.icon}>{iconRight}</span>}
		</button>
	);
}
