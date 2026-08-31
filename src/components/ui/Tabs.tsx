"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Tabs.module.scss";

export type TabsVariant = "folder" | "underline" | "segmented";

export interface TabItem<T extends string> {
	value: T;
	label: ReactNode;
	icon?: ReactNode;
	count?: number;
	disabled?: boolean;
}

interface Props<T extends string> {
	items: TabItem<T>[];
	value: T;
	onChange: (value: T) => void;
	variant?: TabsVariant;
	size?: "sm" | "md";
	scrollable?: boolean;
	className?: string;
	"aria-label"?: string;
}

export default function Tabs<T extends string>({
	items,
	value,
	onChange,
	variant = "folder",
	size = "md",
	scrollable = false,
	className,
	"aria-label": ariaLabel,
}: Props<T>) {
	return (
		<div
			role="tablist"
			aria-label={ariaLabel}
			className={cx(
				styles.bar,
				styles[variant],
				styles[`size-${size}`],
				scrollable && styles.scrollable,
				className,
			)}
		>
			{items.map((item) => (
				<button
					key={item.value}
					type="button"
					role="tab"
					aria-selected={item.value === value}
					disabled={item.disabled}
					className={cx(styles.tab, item.value === value && styles.active)}
					onClick={() => onChange(item.value)}
				>
					{item.icon && <span className={styles.tabIcon}>{item.icon}</span>}
					{item.label}
					{item.count !== undefined && (
						<span className={styles.count}>{item.count}</span>
					)}
				</button>
			))}
		</div>
	);
}
