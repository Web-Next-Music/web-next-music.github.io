"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useLikes, type TrackLikeMeta } from "@/lib/supabase/likesContext";
import {
	getLikeCount,
	getUserLiked,
	addLike,
	removeLike,
} from "@/lib/supabase/likes";
import styles from "./LikeButton.module.scss";

type LikeTarget =
	| { type: "track"; trackId: string; meta?: TrackLikeMeta }
	| { type: "account"; githubLogin: string };

interface Props {
	target: LikeTarget;
	className?: string;
	compact?: boolean;
}

export default function LikeButton({ target, className, compact }: Props) {
	const { user, openAuthModal, isBanned } = useAuth();
	const likes = useLikes();

	const [count, setCount] = useState(0);
	const [individualLiked, setIndividualLiked] = useState(false);
	const [loading, setLoading] = useState(true);

	const isTrack = target.type === "track";
	const table = isTrack ? "track_likes" : "account_likes";
	const id = isTrack ? target.trackId : target.githubLogin;

	useEffect(() => {
		if (isTrack) {
			setLoading(false);
			return;
		}
		let cancelled = false;
		async function load() {
			setLoading(true);
			const [cnt, isLiked] = await Promise.all([
				getLikeCount(table, id),
				user ? getUserLiked(table, id, user.id) : Promise.resolve(false),
			]);
			if (!cancelled) {
				setCount(cnt);
				setIndividualLiked(isLiked);
				setLoading(false);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [isTrack, table, id, user?.id]);

	// Track likes always read from shared context so all buttons stay in sync.
	const metaLikedId =
		isTrack && (target.meta?.title || target.meta?.artist)
			? likes.findLikedByMeta(target.meta?.title, target.meta?.artist)
			: null;

	const liked = isTrack
		? metaLikedId !== null || likes.likedTrackIds.has(target.trackId)
		: individualLiked;

	const toggle = useCallback(async () => {
		if (!user) {
			openAuthModal();
			return;
		}
		if (isBanned) return;

		if (isTrack) {
			const storedId = metaLikedId ?? target.trackId;
			await likes.toggle(
				storedId,
				target.type === "track" ? target.meta : undefined,
			);
			return;
		}

		const wasLiked = liked;
		setIndividualLiked(!wasLiked);
		setCount((c) => c + (wasLiked ? -1 : 1));
		const ok = wasLiked
			? await removeLike(table, id, user.id)
			: await addLike(table, id, user.id);
		if (!ok) {
			setIndividualLiked(wasLiked);
			setCount((c) => c + (wasLiked ? 1 : -1));
		}
	}, [
		user,
		liked,
		isTrack,
		target,
		likes,
		metaLikedId,
		table,
		id,
		openAuthModal,
	]);

	if (!user || isBanned) return null;

	return (
		<button
			className={[
				styles.btn,
				compact ? styles.compact : "",
				liked ? styles.liked : "",
				isBanned ? styles.banned : "",
				className ?? "",
			].join(" ")}
			onClick={toggle}
			disabled={(!compact && loading) || isBanned}
			aria-label={liked ? "Unlike" : "Like"}
			title={isBanned ? "Your account is banned" : liked ? "Unlike" : "Like"}
		>
			<svg
				className={styles.heart}
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill={liked ? "currentColor" : "none"}
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
			</svg>
			{!compact && !loading && <span className={styles.count}>{count}</span>}
		</button>
	);
}
