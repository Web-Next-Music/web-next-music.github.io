"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "@/lib/cx";
import Spinner from "./Spinner";

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
		primary: "bg-accent text-canvas hover:not-disabled:opacity-[.88]",
		secondary:
			"border-border bg-surface text-foreground hover:not-disabled:border-[var(--accent-border)] hover:not-disabled:bg-surface-raised",
		ghost:
			"border-transparent bg-transparent text-muted hover:not-disabled:bg-surface-raised hover:not-disabled:text-foreground",
		danger:
			"border-[var(--danger-border)] bg-[var(--danger-surface)] text-danger hover:not-disabled:border-[var(--danger-border-strong)] hover:not-disabled:bg-[var(--danger-hover)]",
		pill: "h-auto rounded-full bg-accent px-7 py-3 text-[0.84rem] text-canvas hover:not-disabled:opacity-[.88]",
	};
	const sizes: Record<ButtonSize, string> = {
		sm: "h-7 px-3 text-[var(--fs-xs)]",
		md: "h-[var(--control-h-md)] px-4 text-[var(--fs-sm)]",
		lg: "h-[var(--control-h-lg)] px-6 text-[var(--fs-md)]",
	};
	return (
		<button
			type={type}
			disabled={disabled || loading}
			data-loading={loading || undefined}
			className={cx(
				"inline-flex items-center justify-center gap-2 rounded-md border border-transparent font-sans font-bold whitespace-nowrap outline-none transition-[background,border-color,color,opacity] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-(--accent-border-strong) focus-visible:shadow-[0_0_0_3px_var(--accent-surface)]",
				variants[variant],
				variant !== "pill" && sizes[size],
				fullWidth && "w-full",
				className,
			)}
			{...rest}
		>
			{loading && <Spinner size="sm" className="shrink-0" />}
			{iconLeft && (
				<span className="inline-flex shrink-0 items-center">{iconLeft}</span>
			)}
			{children}
			{iconRight && (
				<span className="inline-flex shrink-0 items-center">{iconRight}</span>
			)}
		</button>
	);
}
