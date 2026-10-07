"use client";

import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "@/lib/cx";
import styles from "./Input.module.scss";

export type InputSize = "sm" | "md" | "lg";
export type InputRadius = "sm" | "lg" | "pill";

export interface InputProps extends Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"size"
> {
	size?: InputSize;
	radius?: InputRadius;
	invalid?: boolean;
	iconLeft?: ReactNode;
	iconRight?: ReactNode;
	wrapperClassName?: string;
	ref?: Ref<HTMLInputElement>;
}

export default function Input({
	size = "md",
	radius = "sm",
	invalid = false,
	iconLeft,
	iconRight,
	wrapperClassName,
	className,
	...rest
}: InputProps) {
	const sizes: Record<InputSize, string> = {
		sm: styles["size-smLayout"],
		md: styles["size-mdLayout"],
		lg: styles["size-lgLayout"],
	};
	const radii: Record<InputRadius, string> = {
		sm: styles.smStyle,
		lg: styles["radius-lg"],
		pill: styles["radius-pill"],
	};
	const iconOffset = size === "lg" ? styles.spacingStyle : styles.hasLeftLayout;
	const rightIconOffset =
		size === "lg" ? styles.elementStyle : styles.hasRightLayout;
	return (
		<div className={cx(styles.wrap, wrapperClassName)}>
			{iconLeft && <span className={styles.iconLayout}>{iconLeft}</span>}
			<input
				aria-invalid={invalid || undefined}
				className={cx(
					styles.inputLayout,
					sizes[size],
					radii[radius],
					iconLeft && iconOffset,
					iconRight && rightIconOffset,
					invalid && styles.invalidLayout,
					className,
				)}
				{...rest}
			/>
			{iconRight && <span className={styles.iconLayout2}>{iconRight}</span>}
		</div>
	);
}
