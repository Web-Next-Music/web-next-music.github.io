"use client";

import type { ChangeEvent, Ref, TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import styles from "./Textarea.module.scss";

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
				styles.textareaLayout,
				invalid && styles.invalidLayout,
				autoGrow && styles.autoGrow,
				className,
			)}
			{...rest}
		/>
	);
}
