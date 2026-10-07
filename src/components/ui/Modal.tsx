"use client";

import { X } from "lucide-react";
import {
	useEffect,
	useRef,
	useState,
	type HTMLAttributes,
	type ReactNode,
} from "react";
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
	const [retained, setRetained] = useState(open);
	const contentRef = useRef({ title, children, footer });
	const visible = open || retained;
	const content = open ? { title, children, footer } : contentRef.current;

	useEffect(() => {
		if (open) {
			contentRef.current = { title, children, footer };
		}
	}, [open, title, children, footer]);

	useEffect(() => {
		if (open) {
			setRetained(true);
			return;
		}
		const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
			? 0
			: 160;
		const timer = window.setTimeout(() => setRetained(false), delay);
		return () => window.clearTimeout(timer);
	}, [open]);

	useEffect(() => {
		if (!visible) return;

		lastFocused.current = document.activeElement as HTMLElement | null;
		const container = getScrollContainer();
		const previous = container?.style.overflowY;
		if (container) container.style.overflowY = "hidden";

		return () => {
			if (container) container.style.overflowY = previous ?? "";
			lastFocused.current?.focus?.();
		};
	}, [visible]);

	useEffect(() => {
		if (!open || !closeOnEscape) return;

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open, closeOnEscape, onClose]);

	if (!mounted || !visible) return null;

	return createPortal(
		<div
			className={styles.overlay}
			data-state={open ? "open" : "closing"}
			inert={!open}
			onClick={open && closeOnOverlay ? onClose : undefined}
		>
			<div
				role="dialog"
				aria-modal="true"
				className={cx(styles.box, styles[`size-${size}`], className)}
				onClick={(e) => e.stopPropagation()}
			>
				{(content.title || showClose) && (
					<div className={styles.head}>
						{content.title && (
							<div className={styles.title}>{content.title}</div>
						)}
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
				{content.title || showClose ? (
					<div className={styles.bodyFrame}>
						<div className={cx(styles.body, bodyClassName)}>
							{content.children}
						</div>
					</div>
				) : (
					<div className={cx(styles.body, bodyClassName)}>
						{content.children}
					</div>
				)}
				{content.footer && (
					<div className={styles.footer}>{content.footer}</div>
				)}
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
