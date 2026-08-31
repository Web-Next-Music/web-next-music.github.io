"use client";

import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "@/lib/cx";
import styles from "./Input.module.scss";

export type InputSize = "sm" | "md";
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
	return (
		<div className={cx(styles.wrap, wrapperClassName)}>
			{iconLeft && (
				<span className={cx(styles.icon, styles.iconLeft)}>{iconLeft}</span>
			)}
			<input
				aria-invalid={invalid || undefined}
				className={cx(
					styles.input,
					styles[`size-${size}`],
					styles[`radius-${radius}`],
					iconLeft && styles.hasLeft,
					iconRight && styles.hasRight,
					invalid && styles.invalid,
					className,
				)}
				{...rest}
			/>
			{iconRight && (
				<span className={cx(styles.icon, styles.iconRight)}>{iconRight}</span>
			)}
		</div>
	);
}
