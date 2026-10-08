"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
	useEffect,
	useRef,
	useState,
	type HTMLAttributes,
	type ReactNode,
} from "react";
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

const scrollLocks = new Map<HTMLElement, { count: number; overflow: string }>();

function lockScroll(container: HTMLElement) {
	const lock = scrollLocks.get(container);
	if (lock) lock.count += 1;
	else {
		scrollLocks.set(container, {
			count: 1,
			overflow: container.style.overflowY,
		});
		container.style.overflowY = "hidden";
	}
	return () => {
		const current = scrollLocks.get(container);
		if (!current || --current.count > 0) return;
		container.style.overflowY = current.overflow;
		scrollLocks.delete(container);
	};
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
	const dialogRef = useRef<HTMLDivElement>(null);
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
		const container = document.querySelector<HTMLElement>("[data-app-scroll]");
		if (container) return lockScroll(container);
	}, [visible]);

	if (!mounted || !visible) return null;

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(next) => {
				if (!next) onClose();
			}}
		>
			<Dialog.Portal forceMount>
				<div
					className={styles.overlay}
					data-state={open ? "open" : "closing"}
					inert={!open}
					onClick={(event) => {
						if (open && closeOnOverlay && event.target === event.currentTarget)
							onClose();
					}}
				>
					<Dialog.Content
						ref={dialogRef}
						style={{ outlineStyle: "none" }}
						forceMount
						aria-describedby={undefined}
						aria-label={content.title ? undefined : "Dialog"}
						onOpenAutoFocus={(event) => {
							lastFocused.current =
								document.activeElement as HTMLElement | null;
							event.preventDefault();
							dialogRef.current?.focus({ preventScroll: true });
						}}
						onCloseAutoFocus={(event) => {
							event.preventDefault();
							lastFocused.current?.focus();
						}}
						onEscapeKeyDown={(event) => {
							if (!open || !closeOnEscape) event.preventDefault();
						}}
						onInteractOutside={(event) => event.preventDefault()}
						className={cx(styles.box, styles[`size-${size}`], className)}
						onClick={(e) => e.stopPropagation()}
					>
						{!content.title && <Dialog.Title hidden>Dialog</Dialog.Title>}
						{(content.title || showClose) && (
							<div className={styles.head}>
								{content.title && (
									<Dialog.Title asChild>
										<div className={styles.title}>{content.title}</div>
									</Dialog.Title>
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
					</Dialog.Content>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
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
