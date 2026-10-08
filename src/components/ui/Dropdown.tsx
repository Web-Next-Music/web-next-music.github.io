"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
	useId,
	useLayoutEffect,
	useRef,
	type ReactNode,
	type RefObject,
} from "react";
import { cx } from "@/lib/cx";
import styles from "./Dropdown.module.scss";

interface Props {
	open: boolean;
	onClose: () => void;
	anchorRef: RefObject<HTMLElement | null>;
	align?: "start" | "end";
	className?: string;
	children: ReactNode;
}

export default function Dropdown({
	open,
	onClose,
	anchorRef,
	align = "end",
	className,
	children,
}: Props) {
	const contentId = useId();
	const interactedOutside = useRef(false);

	useLayoutEffect(() => {
		const anchor = anchorRef.current;
		if (!open || !anchor) return;
		const previousControls = anchor.getAttribute("aria-controls");
		anchor.setAttribute("aria-controls", contentId);
		return () => {
			if (previousControls === null) anchor.removeAttribute("aria-controls");
			else anchor.setAttribute("aria-controls", previousControls);
		};
	}, [open, anchorRef, contentId]);

	return (
		<Dialog.Root
			open={open}
			modal={false}
			onOpenChange={(next) => {
				if (!next) onClose();
			}}
		>
			<Dialog.Content
				id={contentId}
				aria-describedby={undefined}
				className={cx(
					styles.dropdown,
					align === "end" ? styles.alignEnd : styles.alignStart,
					className,
				)}
				onOpenAutoFocus={() => {
					interactedOutside.current = false;
				}}
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					if (!interactedOutside.current) anchorRef.current?.focus();
				}}
				onInteractOutside={(event) => {
					if (anchorRef.current?.contains(event.target as Node))
						event.preventDefault();
					else interactedOutside.current = true;
				}}
			>
				<Dialog.Title hidden>Dropdown</Dialog.Title>
				{children}
			</Dialog.Content>
		</Dialog.Root>
	);
}
