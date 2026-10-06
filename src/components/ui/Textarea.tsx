"use client";

import type { ChangeEvent, Ref, TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
	invalid?: boolean;
	autoGrow?: boolean;
	ref?: Ref<HTMLTextAreaElement>;
}

export default function Textarea({
	invalid = false,
	autoGrow = false,
	className,
	style,
	onChange,
	...rest
}: Props) {
	const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		if (autoGrow) {
			e.target.style.height = "auto";
			e.target.style.height = `${e.target.scrollHeight}px`;
		}
		onChange?.(e);
	};

	return (
		<textarea
			aria-invalid={invalid || undefined}
			onChange={handleChange}
			style={{ scrollbarWidth: "thin", ...style }}
			className={cx(
				"min-h-20 w-full resize-y rounded-sm border border-border bg-surface px-3 py-2 font-sans text-(length:--fs-sm) font-bold leading-normal text-foreground outline-none transition-colors duration-200 placeholder:text-muted focus:border-(--accent-border-strong) disabled:cursor-not-allowed disabled:opacity-50 [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border",
				invalid && "border-(--danger-border-strong) focus:border-danger",
				autoGrow && "resize-none overflow-hidden",
				className,
			)}
			{...rest}
		/>
	);
}
