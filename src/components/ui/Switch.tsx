"use client";

import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "@/lib/cx";
import styles from "./Switch.module.scss";

interface Props extends Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"type" | "size" | "onChange" | "checked"
> {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	label?: ReactNode;
	description?: ReactNode;
	size?: "sm" | "md";
	ref?: Ref<HTMLInputElement>;
}

export default function Switch({
	checked,
	onCheckedChange,
	label,
	description,
	size = "md",
	className,
	disabled,
	...rest
}: Props) {
	return (
		<label
			className={cx(
				styles.root,
				styles[`size-${size}`],
				disabled && styles.disabled,
				className,
			)}
		>
			<input
				type="checkbox"
				role="switch"
				className={styles.native}
				checked={checked}
				disabled={disabled}
				onChange={(e) => onCheckedChange(e.target.checked)}
				{...rest}
			/>
			<span className={styles.track}>
				<span className={styles.thumb} />
			</span>
			{(label || description) && (
				<span className={styles.copy}>
					{label && <span className={styles.label}>{label}</span>}
					{description && (
						<span className={styles.description}>{description}</span>
					)}
				</span>
			)}
		</label>
	);
}
