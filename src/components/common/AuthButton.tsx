"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { syncGithubStar } from "@/lib/supabase/publicProfile";
import { checkDDetectorAccess } from "@/lib/track/ddetector";
import { cx } from "@/lib/cx";
import Menu from "@/components/ui/Menu";
import menuStyles from "@/components/ui/Menu.module.scss";
import styles from "./AuthButton.module.scss";

const starredCache = new Map<string, boolean>();
const ddetectorCache = new Map<string, boolean>();

export default function AuthButton() {
	const { user, loading, signOut, openAuthModal, isBanned } = useAuth();
	const router = useRouter();
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [githubStarred, setGithubStarred] = useState(() =>
		user?.id ? (starredCache.get(user.id) ?? false) : false,
	);
	const [isDDetector, setIsDDetector] = useState(() =>
		user?.id ? (ddetectorCache.get(user.id) ?? false) : false,
	);
	const anchorRef = useRef<HTMLButtonElement>(null);
	const closeDropdown = useCallback(() => setDropdownOpen(false), []);

	useEffect(() => {
		if (!user) return;
		syncGithubStar().then((starred) => {
			if (starred !== null) {
				starredCache.set(user.id, starred);
				setGithubStarred(starred);
			}
		});
	}, [user?.id]);

	useEffect(() => {
		if (!user) return;
		if (ddetectorCache.has(user.id)) {
			setIsDDetector(ddetectorCache.get(user.id)!);
			return;
		}
		checkDDetectorAccess(user.id).then((ok) => {
			ddetectorCache.set(user.id, ok);
			setIsDDetector(ok);
		});
	}, [user?.id]);

	if (loading) return <div className={styles.avatarSkeleton} />;

	if (!user) {
		return (
			<button className={styles.signInBtn} onClick={openAuthModal}>
				Sign In
			</button>
		);
	}

	const avatarUrl = isBanned
		? "/avatars/avatar-fallback.png"
		: (user.user_metadata?.avatar_url as string | undefined);
	const initial = (user.user_metadata?.user_name ??
		user.email ??
		"?")[0].toUpperCase();

	return (
		<div className={styles.wrap}>
			<button
				ref={anchorRef}
				className={cx(
					styles.avatarBtn,
					githubStarred && !isBanned && styles.avatarBtnStarred,
				)}
				onClick={() => setDropdownOpen((v) => !v)}
				aria-label="Account menu"
				title={user.user_metadata?.user_name ?? user.email}
			>
				{avatarUrl ? (
					<img src={avatarUrl} alt={initial} className={styles.avatarImg} />
				) : (
					initial
				)}
			</button>
			{githubStarred && !isBanned && (
				<span className={styles.avatarStar} aria-hidden="true">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
						<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
					</svg>
				</span>
			)}

			<Menu
				open={dropdownOpen}
				onClose={closeDropdown}
				anchorRef={anchorRef}
				align="end"
				offset={10}
				minWidth={200}
				className={styles.dropdown}
			>
				<p className={styles.email}>
					{user.user_metadata?.user_name ?? user.email}
				</p>
				<Link
					href={`/profile/${user.id}`}
					className={menuStyles.item}
					onClick={(e) => {
						setDropdownOpen(false);
						if (
							e.button !== 0 ||
							e.metaKey ||
							e.ctrlKey ||
							e.shiftKey ||
							e.altKey
						)
							return;
						e.preventDefault();
						if (window.location.pathname === `/profile/${user.id}`) return;
						router.push(`/profile?id=${user.id}`);
					}}
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
						<circle cx="12" cy="7" r="4" />
					</svg>
					Profile
				</Link>
				{isDDetector && (
					<Link
						href="/ddetector"
						className={menuStyles.item}
						onClick={closeDropdown}
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="M21 21l-4.35-4.35" />
							<path d="M11 8v6M8 11h6" />
						</svg>
						DDetector
					</Link>
				)}
				<button
					type="button"
					className={cx(menuStyles.item, menuStyles.danger)}
					onClick={async () => {
						setDropdownOpen(false);
						await signOut();
					}}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
						<path
							d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<polyline
							points="16 17 21 12 16 7"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<line
							x1="21"
							y1="12"
							x2="9"
							y2="12"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
						/>
					</svg>
					Sign Out
				</button>
			</Menu>
		</div>
	);
}
