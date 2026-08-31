"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/cx";
import { useIsClient } from "@/lib/useIsClient";
import IconButton from "./IconButton";
import styles from "./Modal.module.scss";

export type ModalSize = "sm" | "md" | "lg" | "full";

interface Props {
	open: boolean;
	onClose: () => void;
	title?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	size?: ModalSize;
	closeOnOverlay?: boolean;
	closeOnEscape?: boolean;
	showClose?: boolean;
	className?: string;
	bodyClassName?: string;
}

function getScrollContainer(): HTMLElement | null {
	return document.querySelector<HTMLElement>("[data-app-scroll]");
}

export default function Modal({
	open,
	onClose,
	title,
	children,
	footer,
	size = "md",
	closeOnOverlay = true,
	closeOnEscape = true,
	showClose = true,
	className,
	bodyClassName,
}: Props) {
	const mounted = useIsClient();
	const lastFocused = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!open) return;

		lastFocused.current = document.activeElement as HTMLElement | null;
		const container = getScrollContainer();
		const previous = container?.style.overflowY;
		if (container) container.style.overflowY = "hidden";

		return () => {
			if (container) container.style.overflowY = previous ?? "";
			lastFocused.current?.focus?.();
		};
	}, [open]);

	useEffect(() => {
		if (!open || !closeOnEscape) return;

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open, closeOnEscape, onClose]);

	if (!mounted || !open) return null;

	return createPortal(
		<div
			className={styles.overlay}
			onClick={closeOnOverlay ? onClose : undefined}
		>
			<div
				role="dialog"
				aria-modal="true"
				className={cx(styles.box, styles[`size-${size}`], className)}
				onClick={(e) => e.stopPropagation()}
			>
				{(title || showClose) && (
					<div className={styles.head}>
						{title && <div className={styles.title}>{title}</div>}
						{showClose && (
							<IconButton
								label="Close"
								size="sm"
								className={styles.close}
								onClick={onClose}
							>
								<X size={16} />
							</IconButton>
						)}
					</div>
				)}
				<div className={cx(styles.body, bodyClassName)}>{children}</div>
				{footer && <div className={styles.footer}>{footer}</div>}
			</div>
		</div>,
		document.body,
	);
}

export function ModalHeader({
	className,
	...rest
}: HTMLAttributes<HTMLDivElement>) {
	return <div className={cx(styles.head, className)} {...rest} />;
}

export function ModalBody({
	className,
	...rest
}: HTMLAttributes<HTMLDivElement>) {
	return <div className={cx(styles.body, className)} {...rest} />;
}

export function ModalFooter({
	className,
	...rest
}: HTMLAttributes<HTMLDivElement>) {
	return <div className={cx(styles.footer, className)} {...rest} />;
}
