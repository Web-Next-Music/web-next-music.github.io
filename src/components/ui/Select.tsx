"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/cx";
import { useIsClient } from "@/lib/useIsClient";
import { usePopover } from "./usePopover";

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
		sm: "px-2 py-1 text-[11px]",
		md: "px-3 py-1.5 text-xs",
	};
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
						className="z-(--z-popover) max-h-[min(360px,60vh)] min-w-35 list-none overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-(--shadow-popover) [scrollbar-color:var(--border)_transparent] scrollbar-thin [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
						style={style}
					>
						{options.map((o) => (
							<li key={o.value}>
								<button
									type="button"
									disabled={o.disabled}
									className={cx(
										"flex w-full items-center gap-2 rounded-sm border-0 bg-transparent px-3 py-1.75 text-left font-sans text-[13px] font-bold text-foreground transition-colors hover:not-disabled:bg-(--accent-btn-hover) hover:not-disabled:text-accent disabled:cursor-not-allowed disabled:opacity-50",
										o.value === value && "justify-between text-accent",
									)}
									onClick={() => {
										onChange(o.value);
										setOpen(false);
									}}
								>
									{o.icon && (
										<span className="inline-flex shrink-0 items-center">
											{o.icon}
										</span>
									)}
									{o.label}
									{o.value === value && (
										<svg
											className="ml-auto shrink-0 text-accent"
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
		<div className={cx("flex items-center gap-3", className)}>
			{label && (
				<span className="whitespace-nowrap font-sans text-[11px] font-bold tracking-widest text-muted uppercase">
					{label}
				</span>
			)}
			<div className="relative">
				<button
					ref={triggerRef}
					type="button"
					disabled={disabled}
					aria-haspopup="listbox"
					aria-expanded={open}
					className={cx(
						"flex items-center gap-2 rounded-sm border border-border bg-surface font-sans font-extrabold text-foreground whitespace-nowrap transition-colors hover:not-disabled:border-(--accent-border-strong) disabled:cursor-not-allowed disabled:opacity-50",
						sizes[size],
						open && "border-(--accent-border-strong)",
					)}
					onClick={() => setOpen((v) => !v)}
				>
					{selected?.label ?? placeholder}
					<span className="block h-3 w-px shrink-0 bg-border" />
					<svg
						className={cx(
							"shrink-0 text-muted transition-[transform,color] duration-200",
							open && "rotate-180 text-accent",
						)}
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
