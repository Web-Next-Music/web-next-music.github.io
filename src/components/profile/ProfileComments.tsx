"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { navigateProfile } from "@/lib/profile/navigation";
import {
	getProfileComments,
	createProfileComment,
	updateProfileComment,
	deleteProfileComment,
	type ProfileComment,
} from "@/lib/supabase/profileComments";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import styles from "./comments.module.scss";

type Props = { profileUserId: string; displayName: string };

export default function ProfileComments(props: Props) {
	return <Comments key={props.profileUserId} {...props} />;
}

function Comments({ profileUserId, displayName }: Props) {
	const {
		user,
		loading: authLoading,
		banChecking,
		isBanned,
		openAuthModal,
	} = useAuth();
	const [comments, setComments] = useState<ProfileComment[]>([]);
	const [loading, setLoading] = useState(true);
	const [hasMore, setHasMore] = useState(false);
	const [loadError, setLoadError] = useState(false);
	const [body, setBody] = useState("");
	const [editing, setEditing] = useState<string | null>(null);
	const [editBody, setEditBody] = useState("");
	const [deleting, setDeleting] = useState<ProfileComment | null>(null);
	const [busy, setBusy] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const active = useRef(false);
	const loadLock = useRef(false);
	const mutationLock = useRef(false);
	const request = useRef(0);
	const canWrite = !!user && !authLoading && !banChecking && !isBanned;

	async function load(before?: string) {
		if (loadLock.current) return;
		loadLock.current = true;
		const version = ++request.current;
		setLoading(true);
		setLoadError(false);
		try {
			const page = await getProfileComments(profileUserId, before);
			if (!active.current || version !== request.current) return;
			setComments((previous) =>
				before
					? [
							...previous,
							...page.filter(
								(item) => !previous.some((existing) => existing.id === item.id),
							),
						]
					: page,
			);
			setHasMore(page.length === 30);
		} catch {
			if (active.current && version === request.current) setLoadError(true);
		} finally {
			if (version === request.current) {
				loadLock.current = false;
				if (active.current) setLoading(false);
			}
		}
	}

	useEffect(() => {
		active.current = true;
		void load();
		return () => {
			active.current = false;
			request.current += 1;
			loadLock.current = false;
		};
	}, [profileUserId]);

	async function mutate(
		kind: "create" | "update" | "delete",
		comment?: ProfileComment,
	) {
		if (
			!canWrite ||
			mutationLock.current ||
			(comment && comment.author_id !== user?.id)
		)
			return;
		const text = (kind === "update" ? editBody : body).trim();
		if (kind !== "delete" && (!text || text.length > 2000)) return;
		mutationLock.current = true;
		setBusy(true);
		setActionError(null);
		try {
			if (kind === "create") await createProfileComment(profileUserId, text);
			else if (kind === "update" && comment)
				await updateProfileComment(comment.id, text);
			else if (kind === "delete" && comment)
				await deleteProfileComment(comment.id);
			if (!active.current) return;
			if (kind === "create") {
				setBody("");
				request.current += 1;
				loadLock.current = false;
				await load();
			} else if (kind === "update" && comment) {
				setComments((items) =>
					items.map((item) =>
						item.id === comment.id
							? { ...item, body: text, updated_at: new Date().toISOString() }
							: item,
					),
				);
				setEditing(null);
			} else if (comment) {
				setComments((items) => items.filter((item) => item.id !== comment.id));
				setDeleting(null);
			}
		} catch {
			if (active.current)
				setActionError(
					`Could not ${kind === "create" ? "post" : kind === "update" ? "save" : "delete"} this comment. Please retry.`,
				);
		} finally {
			mutationLock.current = false;
			if (active.current) setBusy(false);
		}
	}

	return (
		<section
			className={styles.section}
			aria-label={`Comments on ${displayName}'s profile`}
		>
			<h2>Comments</h2>
			{canWrite ? (
				<form
					className={styles.composer}
					onSubmit={(event) => {
						event.preventDefault();
						void mutate("create");
					}}
				>
					<textarea
						aria-label="Write a comment"
						placeholder={`Message ${displayName}…`}
						maxLength={2000}
						value={body}
						disabled={busy}
						onChange={(event) => setBody(event.target.value)}
						rows={3}
					/>
					<div className={styles.actions}>
						<span className={styles.muted}>{body.length}/2000</span>
						<Button
							type="submit"
							size="sm"
							loading={busy && !editing && !deleting}
							disabled={busy || !body.trim()}
						>
							Send
						</Button>
					</div>
				</form>
			) : !authLoading && !user ? (
				<Button variant="secondary" onClick={openAuthModal}>
					Sign in to comment
				</Button>
			) : isBanned ? (
				<p className={styles.muted}>Your account has been banned</p>
			) : null}
			{actionError && !deleting && (
				<p role="alert" className={styles.error}>
					{actionError}
				</p>
			)}
			<div className={styles.list}>
				{comments.map((comment) => {
					const name =
						comment.display_name ?? comment.github_login ?? comment.author_id;
					const href = `/profile/${encodeURIComponent(comment.author_id)}`;
					const own = canWrite && user?.id === comment.author_id;
					return (
						<article key={comment.id} className={styles.comment}>
							<a
								className={styles.avatar}
								href={href}
								aria-label={`View ${name}'s profile`}
								onClick={(event) => {
									if (
										event.button === 0 &&
										!event.metaKey &&
										!event.ctrlKey &&
										!event.shiftKey &&
										!event.altKey
									) {
										event.preventDefault();
										navigateProfile(href);
									}
								}}
							>
								{comment.avatar_url ? (
									<Image
										src={comment.avatar_url}
										alt=""
										width={40}
										height={40}
										unoptimized
									/>
								) : (
									<span>{name.charAt(0).toUpperCase()}</span>
								)}
							</a>
							<div className={styles.message}>
								<div className={styles.meta}>
									<a
										href={href}
										onClick={(event) => {
											if (
												event.button === 0 &&
												!event.metaKey &&
												!event.ctrlKey &&
												!event.shiftKey &&
												!event.altKey
											) {
												event.preventDefault();
												navigateProfile(href);
											}
										}}
									>
										{name}
									</a>
									<time dateTime={comment.created_at}>
										{new Date(comment.created_at).toLocaleString()}
									</time>
									{comment.updated_at !== comment.created_at && (
										<span className={styles.muted}>(edited)</span>
									)}
								</div>
								{own && editing === comment.id ? (
									<form
										className={styles.composer}
										onSubmit={(event) => {
											event.preventDefault();
											void mutate("update", comment);
										}}
									>
										<textarea
											aria-label="Edit comment"
											maxLength={2000}
											value={editBody}
											disabled={busy}
											onChange={(event) => setEditBody(event.target.value)}
											rows={3}
											autoFocus
										/>
										<div className={styles.actions}>
											<span className={styles.muted}>
												{editBody.length}/2000
											</span>
											<Button
												size="sm"
												variant="secondary"
												disabled={busy}
												onClick={() => setEditing(null)}
											>
												Cancel
											</Button>
											<Button
												type="submit"
												size="sm"
												loading={busy}
												disabled={!editBody.trim()}
											>
												Save
											</Button>
										</div>
									</form>
								) : (
									<p className={styles.body}>{comment.body}</p>
								)}
								{own && editing !== comment.id && (
									<div className={styles.actions}>
										<Button
											size="sm"
											variant="ghost"
											disabled={busy}
											onClick={() => {
												setEditing(comment.id);
												setEditBody(comment.body);
												setActionError(null);
											}}
										>
											Edit
										</Button>
										<Button
											size="sm"
											variant="ghost"
											disabled={busy}
											onClick={() => {
												setDeleting(comment);
												setActionError(null);
											}}
										>
											Delete
										</Button>
									</div>
								)}
							</div>
						</article>
					);
				})}
			</div>
			{loading && (
				<p className={styles.muted} role="status">
					Loading comments…
				</p>
			)}
			{loadError && (
				<div className={styles.actions}>
					<p className={styles.error} role="alert">
						Could not load comments.
					</p>
					<Button
						variant="secondary"
						disabled={loading || busy}
						onClick={() => void load(comments.at(-1)?.created_at)}
					>
						Retry
					</Button>
				</div>
			)}
			{!loading && !loadError && comments.length === 0 && (
				<p className={styles.muted}>No comments yet</p>
			)}
			{hasMore && !loadError && (
				<Button
					variant="secondary"
					loading={loading}
					disabled={busy}
					onClick={() => void load(comments.at(-1)?.created_at)}
				>
					Load more
				</Button>
			)}
			<Modal
				open={!!deleting && canWrite && deleting.author_id === user?.id}
				title="Delete comment?"
				size="sm"
				onClose={() => {
					if (!busy) setDeleting(null);
				}}
				showClose={!busy}
				closeOnEscape={!busy}
				closeOnOverlay={!busy}
			>
				<p>Delete this comment? This action cannot be undone.</p>
				{actionError && (
					<p className={styles.error} role="alert">
						{actionError}
					</p>
				)}
				<div className={styles.actions}>
					<Button
						variant="secondary"
						disabled={busy}
						onClick={() => setDeleting(null)}
					>
						Cancel
					</Button>
					<Button
						variant="danger"
						loading={busy}
						onClick={() => {
							if (deleting) void mutate("delete", deleting);
						}}
					>
						Delete
					</Button>
				</div>
			</Modal>
		</section>
	);
}
