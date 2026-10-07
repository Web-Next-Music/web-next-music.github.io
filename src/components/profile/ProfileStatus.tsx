"use client";

import { useEffect, useId, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { useProfileStatus } from "@/lib/profile/useProfileStatus";
import styles from "./profile.module.scss";

type StatusEditor = ReturnType<typeof useProfileStatus>;

export default function ProfileStatus({
	text,
	editor,
}: {
	text: string;
	editor?: StatusEditor;
}) {
	const textRef = useRef<HTMLSpanElement>(null);
	const [overflow, setOverflow] = useState(false);
	const [open, setOpen] = useState(false);
	const countId = useId();

	useEffect(() => {
		const element = textRef.current;
		if (!element) return;
		const measure = () =>
			setOverflow(element.scrollWidth > element.clientWidth);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		let active = true;
		void document.fonts.ready.then(() => {
			if (active) measure();
		});
		return () => {
			active = false;
			observer.disconnect();
		};
	}, [text, editor?.editing, editor?.loading]);

	const close = () => {
		if (editor?.editing) void editor.save();
		setOpen(false);
	};

	const statusInput = editor ? (
		<div className={styles.statusEditor}>
			<input
				autoFocus
				aria-label="Profile status"
				aria-describedby={countId}
				aria-invalid={Boolean(editor.error)}
				value={editor.editing ? editor.input : editor.status}
				onFocus={() => {
					if (!editor.editing) editor.startEditing();
				}}
				onChange={(event) => editor.setInput(event.target.value)}
				onPaste={(event) => {
					event.preventDefault();
					const input = event.currentTarget;
					const start = input.selectionStart ?? input.value.length;
					const end = input.selectionEnd ?? start;
					const pasted = event.clipboardData
						.getData("text")
						.replace(/\r\n|[\r\n]/g, " ");
					editor.setInput(
						input.value.slice(0, start) + pasted + input.value.slice(end),
					);
				}}
				onBlur={() => void editor.save()}
				onKeyDown={(event) => {
					if (event.nativeEvent.isComposing) return;
					if (event.key === "Enter") {
						event.preventDefault();
						void editor.save();
					}
					if (event.key === "Escape") {
						event.preventDefault();
						editor.cancel();
					}
				}}
				readOnly={editor.saving}
			/>
			<span id={countId} className={styles.statusCount}>
				{Array.from(editor.editing ? editor.input : editor.status).length}/64
			</span>
		</div>
	) : null;

	return (
		<div className={styles.headerStatus}>
			{editor?.loading ? (
				<div className={styles.statusField}>Loading status…</div>
			) : editor?.editing && !open ? (
				statusInput
			) : (
				<button
					type="button"
					className={styles.statusField}
					data-empty={!text}
					disabled={!editor && !overflow}
					aria-label={
						editor?.error
							? "Retry loading status"
							: overflow
								? "Read full status"
								: editor
									? "Edit status"
									: "Profile status"
					}
					aria-haspopup={overflow ? "dialog" : undefined}
					onClick={() => {
						if (editor?.error) editor.retry();
						else if (overflow) setOpen(true);
						else editor?.startEditing();
					}}
				>
					<span
						ref={textRef}
						className={styles.statusText}
						data-overflow={overflow}
					>
						{editor?.error ? "Retry" : text || "Add status…"}
					</span>
				</button>
			)}
			{editor?.error && (
				<p className={styles.statusError} role="alert">
					{editor.error}
				</p>
			)}
			<Modal open={open} onClose={close} title="Profile status" size="sm">
				{editor ? statusInput : <p className={styles.statusFullText}>{text}</p>}
				{editor?.error && (
					<p className={styles.statusError} role="alert">
						{editor.error}
					</p>
				)}
			</Modal>
		</div>
	);
}
