"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { cx } from "@/lib/cx";

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
		ghost:
			"border-transparent bg-transparent text-muted hover:not-disabled:bg-surface-raised hover:not-disabled:text-foreground",
		surface:
			"border-border bg-surface text-foreground hover:not-disabled:bg-surface-raised hover:not-disabled:text-foreground",
		danger:
			"border-transparent bg-transparent text-danger hover:not-disabled:bg-[var(--danger-surface)] hover:not-disabled:text-danger",
	};
	const sizes: Record<IconButtonSize, string> = {
		sm: "size-[var(--icon-btn-sm)]",
		md: "size-[var(--icon-btn-md)]",
		lg: "size-[var(--icon-btn-lg)]",
	};
	return (
		<button
			type={type}
			aria-label={label}
			title={label}
			className={cx(
				"inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm border p-0 font-sans font-bold outline-none transition-[background,border-color,color,opacity] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-(--accent-border-strong) focus-visible:shadow-[0_0_0_3px_var(--accent-surface)]",
				active
					? "border-(--accent-border) bg-(--accent-surface) text-accent hover:not-disabled:bg-(--accent-surface-hover) hover:not-disabled:text-accent"
					: variants[variant],
				sizes[size],
				className,
			)}
			{...rest}
		>
			{children}
		</button>
	);
}
