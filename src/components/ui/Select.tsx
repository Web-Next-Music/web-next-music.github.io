"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cx } from "@/lib/cx";
import { usePreservedPopoverPlacement } from "./usePreservedPopoverPlacement";
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
	const sizes = {
		sm: styles["size-smLayout"],
		md: styles["size-mdLayout"],
	};
	const [open, setOpen] = useState(false);
	const labelId = useId();
	const triggerRef = useRef<HTMLButtonElement>(null);
	const viewportRef = useRef<HTMLUListElement>(null);
	const placement = usePreservedPopoverPlacement({
		open,
		anchorRef: triggerRef,
		viewportRef,
		align,
		offset: 6,
	});

	const selected = options.find((o) => o.value === value);

	const list = (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				position="popper"
				align={align}
				sideOffset={6}
				collisionPadding={8}
				asChild
			>
				<div
					ref={placement.ref}
					style={{
						zIndex: "var(--z-popover)",
						translate: placement.translate,
					}}
				>
					<SelectPrimitive.Viewport
						asChild
						data-radix-select-viewport={undefined}
					>
						<ul ref={viewportRef} className={styles.listLayout}>
							{options.map((o) => (
								<li key={o.value} role="presentation">
									<SelectPrimitive.Item
										asChild
										value={`option:${o.value}`}
										disabled={o.disabled}
									>
										<button
											type="button"
											disabled={o.disabled}
											className={cx(
												styles.optionLayout,
												o.value === value && styles.optionActive,
											)}
										>
											{o.icon && (
												<span className={styles.optionIconLayout}>
													{o.icon}
												</span>
											)}
											<SelectPrimitive.ItemText asChild>
												<span
													style={{
														display: "contents",
														font: "inherit",
														letterSpacing: "inherit",
													}}
												>
													{o.label}
												</span>
											</SelectPrimitive.ItemText>
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
									</SelectPrimitive.Item>
								</li>
							))}
						</ul>
					</SelectPrimitive.Viewport>
				</div>
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);

	return (
		<SelectPrimitive.Root
			value={selected ? `option:${value}` : ""}
			onValueChange={(next) => onChange(next.slice(7) as T)}
			open={open}
			onOpenChange={setOpen}
			disabled={disabled}
		>
			<div className={cx(styles.wrap, className)}>
				{label && (
					<span id={labelId} className={styles.label}>
						{label}
					</span>
				)}
				<div className={styles.dropdown}>
					<SelectPrimitive.Trigger asChild>
						<button
							ref={triggerRef}
							aria-labelledby={label ? labelId : undefined}
							aria-label={label ? undefined : (selected?.label ?? placeholder)}
							type="button"
							disabled={disabled}
							aria-haspopup="listbox"
							aria-expanded={open}
							className={cx(
								styles.triggerLayout,
								sizes[size],
								open && styles.triggerOpen,
							)}
						>
							{selected?.label ?? placeholder}
							<span className={styles.dividerLayout} />
							<svg
								className={cx(styles.textStyle, open && styles.textStyle2)}
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
					</SelectPrimitive.Trigger>
				</div>
				{list}
			</div>
		</SelectPrimitive.Root>
	);
}
