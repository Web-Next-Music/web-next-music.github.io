"use client";

import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/cx";
import { useIsClient } from "@/lib/useIsClient";
import { usePopover, type PopoverOptions } from "./usePopover";
import styles from "./Menu.module.scss";

export interface MenuItem {
	key: string;
	label: ReactNode;
	icon?: ReactNode;
	onSelect: () => void;
	tone?: "default" | "danger";
	disabled?: boolean;
	active?: boolean;
}

interface Props extends PopoverOptions {
	open: boolean;
	onClose: () => void;
	anchorRef: RefObject<HTMLElement | null>;
	items?: MenuItem[];
	children?: ReactNode;
	className?: string;
}

export default function Menu({
	open,
	onClose,
	anchorRef,
	items,
	children,
	className,
	...popoverOptions
}: Props) {
	const mounted = useIsClient();
	const { style, floatingRef } = usePopover(
		anchorRef,
		open,
		onClose,
		popoverOptions,
	);

	if (!mounted || !open) return null;

	return createPortal(
		<div
			ref={floatingRef as RefObject<HTMLDivElement>}
			role="menu"
			style={style}
			className={cx(styles.menu, className)}
		>
			{items?.map((item) => (
				<button
					key={item.key}
					type="button"
					role="menuitem"
					disabled={item.disabled}
					className={cx(
						styles.item,
						item.tone === "danger" && styles.danger,
						item.active && styles.active,
					)}
					onClick={() => {
						item.onSelect();
						onClose();
					}}
				>
					{item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
					<span className={styles.itemLabel}>{item.label}</span>
				</button>
			))}
			{children}
		</div>,
		document.body,
	);
}
