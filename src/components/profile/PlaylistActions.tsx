"use client";

import { useState, useEffect, useRef } from "react";
import { type Playlist } from "@/lib/supabase/playlists";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import IconButton from "@/components/ui/IconButton";
import { cx } from "@/lib/cx";
import styles from "./profile.module.scss";

export interface PlaylistManagementProps {
	isPinned: boolean;
	onDelete: (id: string) => Promise<void>;
	onRename: (id: string, name: string) => Promise<void>;
	onTogglePin: (id: string) => Promise<void>;
}

export default function PlaylistActions({
	playlist,
	isPinned,
	onDelete,
	onRename,
	onTogglePin,
	variant = "card",
}: PlaylistManagementProps & {
	playlist: Playlist;
	variant?: "card" | "header";
}) {
	const [editing, setEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [renaming, setRenaming] = useState(false);
	const [renameError, setRenameError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [editName, setEditName] = useState(playlist.name);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (editing) inputRef.current?.focus();
	}, [editing]);

	const handleDelete = async () => {
		if (deleting) return;
		setDeleting(true);
		setDeleteError(null);
		try {
			await onDelete(playlist.id);
			setConfirmDelete(false);
		} catch {
			setDeleteError("Could not delete the playlist. Please try again.");
		} finally {
			setDeleting(false);
		}
	};

	const handleRename = async () => {
		if (renaming) return;
		const trimmed = editName.trim();
		if (!trimmed || trimmed === playlist.name) {
			setEditing(false);
			return;
		}
		setRenaming(true);
		setRenameError(null);
		try {
			await onRename(playlist.id, trimmed);
			setEditing(false);
		} catch {
			setRenameError("Could not rename the playlist. Please try again.");
		} finally {
			setRenaming(false);
		}
	};

	return (
		<>
			<Modal
				open={editing}
				onClose={() => {
					if (!renaming) setEditing(false);
				}}
				showClose={!renaming}
				closeOnEscape={!renaming}
				closeOnOverlay={!renaming}
				title="Rename playlist"
				size="sm"
			>
				<form
					className={styles.playlistRenameForm}
					onSubmit={(e) => {
						e.preventDefault();
						void handleRename();
					}}
				>
					<Input
						ref={inputRef}
						size="lg"
						radius="lg"
						className={styles.playlistRenameInput}
						aria-label="Playlist name"
						value={editName}
						onChange={(e) => setEditName(e.target.value)}
						autoFocus
					/>
					{renameError && <p role="alert">{renameError}</p>}
					<div className={styles.bioBtnRow}>
						<Button
							type="submit"
							variant="pill"
							loading={renaming}
							disabled={renaming || !editName.trim()}
						>
							Save
						</Button>
					</div>
				</form>
			</Modal>
			<Modal
				open={confirmDelete}
				onClose={() => {
					if (!deleting) setConfirmDelete(false);
				}}
				title="Delete playlist?"
				size="sm"
				showClose={!deleting}
				closeOnEscape={!deleting}
				closeOnOverlay={!deleting}
			>
				<div className={styles.playlistRenameForm}>
					<p>Delete “{playlist.name}”? This action cannot be undone.</p>
					{deleteError && <p role="alert">{deleteError}</p>}
					<div className={styles.bioBtnRow}>
						<Button
							size="lg"
							variant="secondary"
							disabled={deleting}
							onClick={() => setConfirmDelete(false)}
						>
							Cancel
						</Button>
						<Button
							size="lg"
							variant="danger"
							loading={deleting}
							onClick={() => void handleDelete()}
						>
							Delete
						</Button>
					</div>
				</div>
			</Modal>
			<div
				className={
					variant === "header"
						? styles.playlistHeaderActions
						: styles.playlistActions
				}
				onClick={(e) => e.stopPropagation()}
			>
				<IconButton
					className={cx(styles.iconBtn, isPinned && styles.iconBtnPinned)}
					onClick={() => onTogglePin(playlist.id)}
					label={
						isPinned ? "Unpin from public profile" : "Pin to public profile"
					}
				>
					<svg
						width="17"
						height="17"
						viewBox="0 0 24 24"
						fill={isPinned ? "currentColor" : "none"}
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<line x1="12" y1="17" x2="12" y2="22" />
						<path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
					</svg>
				</IconButton>
				<IconButton
					className={styles.iconBtn}
					onClick={() => {
						setRenameError(null);
						setEditName(playlist.name);
						setEditing(true);
					}}
					label="Rename"
				>
					<svg
						width="17"
						height="17"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
					>
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
						<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
					</svg>
				</IconButton>
				<IconButton
					className={cx(styles.iconBtn, styles.iconBtnDanger)}
					variant="danger"
					onClick={() => {
						setDeleteError(null);
						setConfirmDelete(true);
					}}
					label="Delete playlist"
				>
					<svg
						width="17"
						height="17"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
					>
						<polyline points="3 6 5 6 21 6" />
						<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
						<path d="M10 11v6M14 11v6" />
						<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
					</svg>
				</IconButton>
			</div>
		</>
	);
}
