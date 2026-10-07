"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { navigateProfile } from "@/lib/profile/navigation";
import { UserRound, Heart } from "lucide-react";

import { useState, useEffect } from "react";
import { config } from "@/lib/config";
import {
	getPublicProfileByUserId,
	getUserPinnedPlaylists,
	getUserStats,
	getProfileLikesVisibility,
	syncGithubStarForProfile,
	type UserProfile,
} from "@/lib/supabase/publicProfile";
import { type Playlist } from "@/lib/supabase/playlists";
import PlaylistCard from "./PlaylistCard";
import Card from "@/components/ui/Card";
import PlaylistTracks from "./PlaylistTracks";
import PublicLikedTracks from "./PublicLikedTracks";
import likesStyles from "./publicLikes.module.scss";
import styles from "./profile.module.scss";
import ProfileStatus from "./ProfileStatus";
import { renderBio, formatJoinDate } from "@/lib/profile/profileHelpers";

export default function PublicProfileClient({
	userId,
	playlistId,
}: {
	userId: string;
	playlistId?: string;
}) {
	const searchParams = useSearchParams();
	const requestedTab = searchParams.get("tab");
	const openTab = (nextTab: "bio" | "likes") => {
		navigateProfile(`/profile/${encodeURIComponent(userId)}?tab=${nextTab}`);
	};
	const [profile, setProfile] = useState<UserProfile | null | "loading">(
		"loading",
	);
	const [playlists, setPlaylists] = useState<Playlist[]>([]);
	const [stats, setStats] = useState<{
		likes: number;
		playlists: number;
	} | null>(null);
	const [banned, setBanned] = useState(false);
	const [starred, setStarred] = useState(false);
	const [exactDate, setExactDate] = useState(false);
	const [profileError, setProfileError] = useState(false);
	const [reload, setReload] = useState(0);
	const [likesVisibility, setLikesVisibility] = useState<{
		userId: string;
		enabled: boolean;
	} | null>(null);
	const [tab, setTab] = useState<"bio" | "likes">("bio");
	useEffect(() => {
		setTab(requestedTab === "likes" ? "likes" : "bio");
	}, [requestedTab, userId, playlistId]);
	const showLikes =
		!banned && likesVisibility?.userId === userId && likesVisibility.enabled;

	useEffect(() => {
		let active = true;
		setProfile("loading");
		setProfileError(false);
		setStats(null);
		setPlaylists([]);
		setBanned(false);
		setStarred(false);
		setLikesVisibility(null);

		getPublicProfileByUserId(userId)
			.then((result) => {
				if (!active) return;
				if (!result) {
					setProfile(null);
					return;
				}

				setProfile(result.profile);
				setBanned(result.banned);

				const name = result.banned
					? userId
					: (result.profile.display_name ??
						result.profile.github_login ??
						userId);
				document.title = `${name} - Next Music`;

				if (!result.banned) {
					getProfileLikesVisibility(result.profile.user_id)
						.then((enabled) => {
							if (active) setLikesVisibility({ userId, enabled });
						})
						.catch(() => {
							if (active) setLikesVisibility(null);
						});
					Promise.all([
						getUserStats(result.profile.user_id),
						getUserPinnedPlaylists(result.profile.user_id),
					])
						.then(([stats, playlists]) => {
							if (!active) return;
							setStats(stats);
							setPlaylists(playlists);
						})
						.catch(() => {
							if (active) setStats(null);
						});

					if (result.profile.github_id) {
						syncGithubStarForProfile(result.profile.github_id).then((s) => {
							if (active && s !== null) setStarred(s);
						});
					}
				}
			})
			.catch(() => {
				if (!active) return;
				setProfileError(true);
				setProfile(null);
			});
		return () => {
			active = false;
			document.title = "Next Music";
		};
	}, [userId, reload]);

	if (profile === "loading") {
		return (
			<div className={styles.centered}>
				<div className={styles.loadingDots}>
					<span />
					<span />
					<span />
				</div>
			</div>
		);
	}

	if (!profile) {
		return (
			<div className={styles.centered}>
				{profileError ? (
					<>
						<p className={styles.statusError} role="alert">
							Could not load this profile. Please retry.
						</p>
						<button
							type="button"
							onClick={() => setReload((value) => value + 1)}
						>
							Retry
						</button>
					</>
				) : (
					<p className={styles.centeredText}>User not found</p>
				)}
			</div>
		);
	}

	const displayName = banned
		? userId
		: (profile.display_name ?? profile.github_login ?? userId);

	return (
		<div className={`${styles.page} ${styles.publicPage}`}>
			<div className={styles.layout}>
				<aside className={styles.sidebar}>
					<div className={styles.userCard}>
						<div className={styles.avatarWrap}>
							{banned ? (
								<Image
									src="/avatars/avatar-fallback.png"
									alt="Banned"
									width={88}
									height={88}
									className={styles.avatar}
								/>
							) : profile.avatar_url ? (
								<Image
									src={profile.avatar_url}
									alt={displayName}
									width={88}
									height={88}
									className={styles.avatar}
								/>
							) : (
								<div className={styles.avatarPlaceholder}>
									{displayName[0].toUpperCase()}
								</div>
							)}
						</div>
						<h1 className={styles.username}>
							{displayName}
							{!banned &&
								(starred ? (
									<span className={styles.starBadge} title="Starred Next Music">
										<svg
											width="17"
											height="17"
											viewBox="0 0 24 24"
											fill="currentColor"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
										</svg>
									</span>
								) : (
									<a
										href={config.github.client.url}
										target="_blank"
										rel="noopener noreferrer"
										className={styles.starBadge}
										title="Star Web-Next-Music/Next-Music-Client on GitHub"
										data-inactive
									>
										<svg
											width="17"
											height="17"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
										</svg>
									</a>
								))}
						</h1>
						{!banned && profile.created_at && (
							<p
								className={styles.joinDate}
								onClick={() => setExactDate((v) => !v)}
							>
								{formatJoinDate(profile.created_at, exactDate)}
							</p>
						)}
						{!banned && profile.status && (
							<ProfileStatus text={profile.status} />
						)}
						{stats && (
							<div className={styles.headerStats}>
								<div>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="17"
										height="15"
										viewBox="0 0 24 24"
										fill="currentColor"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
									</svg>
									<strong>{stats.likes}</strong>
									<span>Liked tracks</span>
								</div>
								<div>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="17"
										height="15"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M16 5H3" />
										<path d="M11 12H3" />
										<path d="M11 19H3" />
										<path d="M21 16V5" />
										<circle cx="18" cy="16" r="3" />
									</svg>
									<strong>{stats.playlists}</strong>
									<span>Playlists</span>
								</div>
							</div>
						)}
					</div>
				</aside>

				<div className={styles.content}>
					{banned && (
						<div className={styles.banNotice}>
							<svg
								width="17"
								height="15"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="12" cy="12" r="10" />
								<line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
							</svg>
							This user has been banned.
						</div>
					)}
					{!banned && (
						<div className={likesStyles.main}>
							<div
								className={`${styles.statsCard} ${likesStyles.tabs}`}
								aria-label="Profile sections"
							>
								<button
									type="button"
									aria-pressed={!playlistId && (tab === "bio" || !showLikes)}
									onClick={() => openTab("bio")}
								>
									<UserRound size={16} aria-hidden="true" />
									Bio
								</button>
								{showLikes && (
									<button
										type="button"
										aria-pressed={!playlistId && tab === "likes"}
										onClick={() => openTab("likes")}
									>
										<Heart
											size={16}
											aria-hidden="true"
											fill={
												!playlistId && tab === "likes" ? "currentColor" : "none"
											}
										/>
										Liked tracks
									</button>
								)}
							</div>
							{playlistId && (
								<PlaylistTracks
									key={`${userId}/${playlistId}`}
									userId={userId}
									playlistId={playlistId}
								/>
							)}
							{!playlistId && showLikes && tab === "likes" && (
								<PublicLikedTracks key={userId} userId={profile.user_id} />
							)}
							{!banned && !playlistId && (tab === "bio" || !showLikes) && (
								<Card
									as="section"
									variant="modal"
									heading="Bio"
									className={styles.profileContentCard}
								>
									{profile.bio?.trim() ? (
										<div
											className={styles.bioRendered}
											dangerouslySetInnerHTML={{
												__html: renderBio(profile.bio),
											}}
										/>
									) : (
										<div className={styles.empty}>No bio</div>
									)}
								</Card>
							)}
						</div>
					)}

					{!banned && (
						<Card
							as="section"
							variant="modal"
							heading="Pinned Playlists"
							className={styles.pinnedSection}
						>
							{playlists.length === 0 ? (
								<div className={styles.empty}>No pinned playlists</div>
							) : (
								<div className={styles.playlistList}>
									{playlists.map((pl) => (
										<PlaylistCard key={pl.id} playlist={pl} userId={userId} />
									))}
								</div>
							)}
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
