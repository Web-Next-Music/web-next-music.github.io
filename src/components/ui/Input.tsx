"use client";

import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "@/lib/cx";

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
		sm: "h-7 px-3 text-[var(--fs-xs)]",
		md: "h-[var(--control-h-md)] px-3 text-[var(--fs-sm)]",
		lg: "h-[var(--control-h-lg)] px-4 text-[var(--fs-md)]",
	};
	const radii: Record<InputRadius, string> = {
		sm: "rounded-sm",
		lg: "rounded-2xl",
		pill: "rounded-full",
	};
	const iconOffset = size === "lg" ? "pl-10" : "pl-[34px]";
	const rightIconOffset = size === "lg" ? "pr-10" : "pr-[34px]";
	return (
		<div className={cx("relative flex w-full items-center", wrapperClassName)}>
			{iconLeft && (
				<span className="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 items-center text-muted">
					{iconLeft}
				</span>
			)}
			<input
				aria-invalid={invalid || undefined}
				className={cx(
					"w-full border border-border bg-surface font-sans font-bold text-foreground outline-none transition-colors duration-200 focus:border-(--accent-border-strong) placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50",
					sizes[size],
					radii[radius],
					iconLeft && iconOffset,
					iconRight && rightIconOffset,
					invalid && "focus:border-danger border-(--danger-border-strong)",
					className,
				)}
				{...rest}
			/>
			{iconRight && (
				<span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center text-muted">
					{iconRight}
				</span>
			)}
		</div>
	);
}
