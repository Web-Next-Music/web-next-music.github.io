"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import {
	useId,
	useLayoutEffect,
	useRef,
	useState,
	type ReactNode,
	type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/cx";
import type { PopoverOptions } from "@/types/ui";
import { usePreservedPopoverPlacement } from "./usePreservedPopoverPlacement";
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
	align = "start",
	side = "bottom",
	offset = 6,
	minWidth,
	matchAnchorWidth = false,
}: Props) {
	const [rect, setRect] = useState<DOMRect | null>(null);
	const contentId = useId();
	const placement = usePreservedPopoverPlacement({
		open,
		anchorRef,
		align,
		side,
		offset,
	});
	const interactedOutside = useRef(false);
	useLayoutEffect(() => {
		if (open) interactedOutside.current = false;
		const anchor = anchorRef.current;
		if (!anchor) return;
		const attributes = [
			"aria-expanded",
			"aria-controls",
			"aria-haspopup",
		] as const;
		const previous = attributes.map((name) => anchor.getAttribute(name));
		anchor.setAttribute("aria-expanded", String(open));
		anchor.setAttribute("aria-controls", contentId);
		anchor.setAttribute(
			"aria-haspopup",
			children !== undefined || !items ? "dialog" : "menu",
		);
		return () => {
			attributes.forEach((name, index) => {
				const value = previous[index];
				if (value === null) anchor.removeAttribute(name);
				else anchor.setAttribute(name, value);
			});
		};
	}, [anchorRef, open, contentId, children, items]);
	useLayoutEffect(() => {
		if (!open) return;
		const update = () =>
			setRect(anchorRef.current?.getBoundingClientRect() ?? null);
		update();
		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, true);
		const observer = new ResizeObserver(update);
		if (anchorRef.current) observer.observe(anchorRef.current);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, [open, anchorRef]);

	const restoreFocus = (event: Event) => {
		event.preventDefault();
		if (!interactedOutside.current) anchorRef.current?.focus();
	};
	const contentProps = {
		ref: placement.ref,
		id: contentId,
		"aria-label": "Menu",
		"aria-labelledby": undefined,
		align,
		side,
		sideOffset: offset,
		collisionPadding: 8,
		className: cx(styles.menu, className),
		style: {
			minWidth: matchAnchorWidth ? rect?.width : minWidth,
			outlineStyle: "none" as const,
			translate: placement.translate,
		},
		onOpenAutoFocus: (event: Event) => {
			interactedOutside.current = false;
			event.preventDefault();
			(event.target as HTMLElement).focus({ preventScroll: true });
		},
		onCloseAutoFocus: restoreFocus,
		onInteractOutside: (event: CustomEvent<{ originalEvent: Event }>) => {
			if (anchorRef.current?.contains(event.target as Node))
				event.preventDefault();
			else interactedOutside.current = true;
		},
	};
	const entries = items?.map((item) => (
		<DropdownMenu.Item
			key={item.key}
			asChild
			disabled={item.disabled}
			onSelect={() => {
				item.onSelect();
				onClose();
			}}
		>
			<button
				type="button"
				disabled={item.disabled}
				className={cx(
					styles.item,
					item.tone === "danger" && styles.danger,
					item.active && styles.active,
				)}
			>
				{item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
				<span className={styles.itemLabel}>{item.label}</span>
			</button>
		</DropdownMenu.Item>
	));

	if (children !== undefined || !items) {
		return (
			<Popover.Root
				open={open}
				onOpenChange={(next) => {
					if (!next) onClose();
				}}
			>
				<Popover.Anchor virtualRef={anchorRef} />
				<Popover.Portal>
					<Popover.Content {...contentProps}>
						{items?.map((item) => (
							<button
								key={item.key}
								type="button"
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
								{item.icon && (
									<span className={styles.itemIcon}>{item.icon}</span>
								)}
								<span className={styles.itemLabel}>{item.label}</span>
							</button>
						))}
						{children}
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>
		);
	}

	return (
		<DropdownMenu.Root
			open={open && !!rect}
			onOpenChange={(next) => {
				if (!next) onClose();
			}}
			modal={false}
		>
			{rect &&
				createPortal(
					<DropdownMenu.Trigger
						tabIndex={-1}
						aria-hidden
						style={{
							position: "fixed",
							left: rect?.left,
							top: rect?.top,
							width: rect?.width,
							height: rect?.height,
							opacity: 0,
							pointerEvents: "none",
							padding: 0,
							border: 0,
						}}
					/>,
					document.body,
				)}
			<DropdownMenu.Portal>
				<DropdownMenu.Content {...contentProps}>{entries}</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
