"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/cx";
import { useIsClient } from "@/lib/useIsClient";
import { usePopover } from "./usePopover";
import styles from "./Select.module.scss";

export interface SelectOption<T extends string> {
	value: T;
	label: string;
	icon?: ReactNode;
	disabled?: boolean;
}

interface Props<T extends string> {
	value: T;
	onChange: (value: T) => void;
	options: SelectOption<T>[];
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	align?: "start" | "end";
	size?: "sm" | "md";
	className?: string;
}

export default function Select<T extends string>({
	value,
	onChange,
	options,
	label,
	placeholder = "Select",
	disabled = false,
	align = "end",
	size = "md",
	className,
}: Props<T>) {
	const [open, setOpen] = useState(false);
	const mounted = useIsClient();
	const triggerRef = useRef<HTMLButtonElement>(null);

	const { style, floatingRef } = usePopover(
		triggerRef,
		open,
		() => setOpen(false),
		{ align, minWidth: 140 },
	);

	const selected = options.find((o) => o.value === value);

	const list =
		mounted && open
			? createPortal(
					<ul
						ref={floatingRef as RefObject<HTMLUListElement>}
						className={styles.list}
						style={style}
					>
						{options.map((o) => (
							<li key={o.value}>
								<button
									type="button"
									disabled={o.disabled}
									className={cx(
										styles.option,
										o.value === value && styles.optionActive,
									)}
									onClick={() => {
										onChange(o.value);
										setOpen(false);
									}}
								>
									{o.icon && (
										<span className={styles.optionIcon}>{o.icon}</span>
									)}
									{o.label}
									{o.value === value && (
										<svg
											className={styles.optionCheck}
											width="12"
											height="12"
											viewBox="0 0 24 24"
											fill="none"
										>
											<path
												d="M5 13l4 4L19 7"
												stroke="currentColor"
												strokeWidth="2.5"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									)}
								</button>
							</li>
						))}
					</ul>,
					document.body,
				)
			: null;

	return (
		<div className={cx(styles.wrap, className)}>
			{label && <span className={styles.label}>{label}</span>}
			<div className={styles.dropdown}>
				<button
					ref={triggerRef}
					type="button"
					disabled={disabled}
					aria-haspopup="listbox"
					aria-expanded={open}
					className={cx(
						styles.trigger,
						styles[`size-${size}`],
						open && styles.triggerOpen,
					)}
					onClick={() => setOpen((v) => !v)}
				>
					{selected?.label ?? placeholder}
					<span className={styles.divider} />
					<svg
						className={cx(styles.chevron, open && styles.chevronOpen)}
						width="10"
						height="10"
						viewBox="0 0 24 24"
						fill="none"
					>
						<path
							d="M6 9l6 6 6-6"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
			</div>
			{list}
		</div>
	);
}
