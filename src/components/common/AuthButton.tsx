"use client";

import Image from "next/image";

import { useCallback, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { syncGithubStar } from "@/lib/supabase/publicProfile";
import { checkDDetectorAccess } from "@/lib/track/ddetector";
import { cx } from "@/lib/cx";
import Dropdown from "@/components/ui/Dropdown";
import dropdownStyles from "@/components/ui/Dropdown.module.scss";
import { useClickOutside } from "@/lib/useClickOutside";

const starredCache = new Map<string, boolean>();
const ddetectorCache = new Map<string, boolean>();

export default function AuthButton() {
	const { user, loading, signOut, openAuthModal, isBanned } = useAuth();
	const userId = user?.id;
	const router = useRouter();
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [githubStarred, setGithubStarred] = useState(() =>
		user?.id ? (starredCache.get(user.id) ?? false) : false,
	);
	const [isDDetector, setIsDDetector] = useState(() =>
		user?.id ? (ddetectorCache.get(user.id) ?? false) : false,
	);
	const anchorRef = useRef<HTMLButtonElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const closeDropdown = useCallback(() => setDropdownOpen(false), []);

	useClickOutside(wrapRef, dropdownOpen, closeDropdown);

	useEffect(() => {
		if (!userId) return;
		syncGithubStar().then((starred) => {
			if (starred !== null) {
				starredCache.set(userId, starred);
				setGithubStarred(starred);
			}
		});
	}, [userId]);

	useEffect(() => {
		if (!userId) return;
		if (ddetectorCache.has(userId)) {
			setIsDDetector(ddetectorCache.get(userId)!);
			return;
		}
		checkDDetectorAccess(userId).then((ok) => {
			ddetectorCache.set(userId, ok);
			setIsDDetector(ok);
		});
	}, [userId]);

	if (loading)
		return (
			<div
				className={
					"w-8 h-8 rounded-(--radius-full) [background:var(--accent-mark-bg)] [border:1px_solid_var(--accent-border)] animate-[nm-pulse_1.4s_var(--ease-in-out)_infinite]"
				}
			/>
		);

	if (!user) {
		return (
			<button
				className={
					"font-(family-name:--font-heading-large) text-[14px] font-bold text-muted p-[6px_14px] rounded-xs [border:1px_solid_var(--border)] bg-none cursor-pointer [transition:color_0.15s,border-color_0.15s,background_0.15s] whitespace-nowrap hover:text-accent hover:border-accent hover:[background:var(--badge-background-color)]"
				}
				onClick={openAuthModal}
			>
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
		<div className="relative" ref={wrapRef}>
			<button
				ref={anchorRef}
				className={cx(
					"relative w-8 h-8 rounded-(--radius-full) [background:var(--accent-mark-bg)] [border:1px_solid_var(--accent-border-strong)] text-accent font-(family-name:--font-heading-large) text-[13px] font-bold cursor-pointer flex items-center justify-center [transition:background_0.15s,border-color_0.15s] hover:[background:var(--accent-surface-hover)] hover:border-(--accent-border-strong)",
					githubStarred &&
						!isBanned &&
						"mask-[radial-gradient(circle_at_26px_26px,transparent_8px,black_8px)]",
				)}
				onClick={() => setDropdownOpen((v) => !v)}
				aria-label="Account menu"
				title={user.user_metadata?.user_name ?? user.email}
			>
				{avatarUrl ? (
					<Image
						src={avatarUrl}
						alt={initial}
						width={32}
						height={32}
						className={
							"w-full h-full rounded-(--radius-full) object-cover block"
						}
					/>
				) : (
					initial
				)}
			</button>
			{githubStarred && !isBanned && (
				<span
					className={
						"absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-(--radius-full) flex items-center justify-center text-[#e3b341] leading-0 pointer-events-none"
					}
					aria-hidden="true"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
						<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
					</svg>
				</span>
			)}

			<Dropdown open={dropdownOpen} align="end">
				<p className={dropdownStyles.header}>
					{user.user_metadata?.user_name ?? user.email}
				</p>
				<Link
					href={`/profile/${user.id}`}
					className={dropdownStyles.item}
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
						className={dropdownStyles.item}
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
					className={cx(dropdownStyles.item, dropdownStyles.danger)}
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
			</Dropdown>
		</div>
	);
}
