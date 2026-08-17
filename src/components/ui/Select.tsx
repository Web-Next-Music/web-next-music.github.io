"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Select.module.scss";

interface Option<T extends string> {
	value: T;
	label: string;
}

interface Props<T extends string> {
	value: T;
	onChange: (value: T) => void;
	options: Option<T>[];
	label?: string;
}

export default function Select<T extends string>({
	value,
	onChange,
	options,
	label,
}: Props<T>) {
	const [open, setOpen] = useState(false);
	const [listStyle, setListStyle] = useState<React.CSSProperties>({});
	const triggerRef = useRef<HTMLButtonElement>(null);
	const listRef = useRef<HTMLUListElement>(null);

	const selected = options.find((o) => o.value === value);

	useLayoutEffect(() => {
		if (!open || !triggerRef.current) return;

		const updatePosition = () => {
			if (!triggerRef.current) return;
			const rect = triggerRef.current.getBoundingClientRect();
			setListStyle({
				position: "absolute",
				top: rect.bottom + window.scrollY + 6,
				right: window.innerWidth - rect.right,
				minWidth: 140,
				zIndex: 9999,
			});
		};

		updatePosition();
		window.addEventListener("resize", updatePosition);
		return () => window.removeEventListener("resize", updatePosition);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onPointer = (e: PointerEvent) => {
			if (
				!triggerRef.current?.contains(e.target as Node) &&
				!listRef.current?.contains(e.target as Node)
			)
				setOpen(false);
		};
		document.addEventListener("pointerdown", onPointer);
		return () => document.removeEventListener("pointerdown", onPointer);
	}, [open]);

	const list = open ? (
		<ul ref={listRef} className={styles.list} style={listStyle}>
			{options.map((o) => (
				<li key={o.value}>
					<button
						type="button"
						className={`${styles.option} ${o.value === value ? styles.optionActive : ""}`}
						onClick={() => {
							onChange(o.value);
							setOpen(false);
						}}
					>
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
		</ul>
	) : null;

	return (
		<div className={styles.wrap}>
			{label && <span className={styles.label}>{label}</span>}
			<div className={styles.dropdown}>
				<button
					ref={triggerRef}
					type="button"
					className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
					onClick={() => setOpen((v) => !v)}
				>
					{selected?.label}
					<span className={styles.divider} />
					<svg
						className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
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
				{typeof document !== "undefined" && createPortal(list, document.body)}
			</div>
		</div>
	);
}
