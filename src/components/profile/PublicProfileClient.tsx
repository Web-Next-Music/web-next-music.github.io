"use client";

import Image from "next/image";
import LogoIcon from "@/components/common/LogoIcon";
import { useSearchParams } from "next/navigation";
import { navigateProfile } from "@/lib/profile/navigation";
import { UserRound, Heart, ListMusic } from "lucide-react";

import { useState, useEffect } from "react";
import { config } from "@/lib/config";
import {
	getPublicProfileByUserId,
	getUserPinnedPlaylists,
	getUserStats,
	getProfileLikesVisibility,
	getProfilePlaylistsVisibility,
	syncGithubStarForProfile,
	type UserProfile,
} from "@/lib/supabase/publicProfile";
import { getPlaylists, type Playlist } from "@/lib/supabase/playlists";
import PlaylistCard from "./PlaylistCard";
import Card from "@/components/ui/Card";
import PlaylistTracks from "./PlaylistTracks";
import PublicLikedTracks from "./PublicLikedTracks";
import likesStyles from "./publicLikes.module.scss";
import styles from "./profile.module.scss";
import ProfileStatus from "./ProfileStatus";
import { PublicProfileConnections } from "./ProfileConnections";
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
	const openTab = (nextTab: "bio" | "likes" | "playlists") => {
		navigateProfile(`/profile/${encodeURIComponent(userId)}?tab=${nextTab}`);
	};
	const [profile, setProfile] = useState<UserProfile | null | "loading">(
		"loading",
	);
	const [playlists, setPlaylists] = useState<Playlist[]>([]);
	const [allPlaylists, setAllPlaylists] = useState<{
		userId: string;
		items: Playlist[];
	} | null>(null);
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
	const [playlistsVisibility, setPlaylistsVisibility] = useState<{
		userId: string;
		enabled: boolean;
	} | null>(null);
	const [tab, setTab] = useState<"bio" | "likes" | "playlists">("bio");
	useEffect(() => {
		setTab(
			requestedTab === "likes" || requestedTab === "playlists"
				? requestedTab
				: "bio",
		);
	}, [requestedTab, userId, playlistId]);
	const showLikes =
		!banned && likesVisibility?.userId === userId && likesVisibility.enabled;

	const showPlaylists =
		!banned &&
		playlistsVisibility?.userId === userId &&
		playlistsVisibility.enabled;
	const visiblePlaylistId = showPlaylists ? playlistId : undefined;
	const visibleTab =
		(tab === "likes" && !showLikes) || (tab === "playlists" && !showPlaylists)
			? "bio"
			: tab;

	useEffect(() => {
		if (!showPlaylists) return;
		let active = true;
		setAllPlaylists(null);
		void getPlaylists(userId).then((items) => {
			if (active) setAllPlaylists({ userId, items });
		});
		return () => {
			active = false;
		};
	}, [userId, showPlaylists, reload]);

	useEffect(() => {
		let active = true;
		setProfile("loading");
		setProfileError(false);
		setStats(null);
		setPlaylists([]);
		setBanned(false);
		setStarred(false);
		setLikesVisibility(null);
		setPlaylistsVisibility(null);

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
					getProfilePlaylistsVisibility(result.profile.user_id)
						.then((enabled) => {
							if (active) setPlaylistsVisibility({ userId, enabled });
						})
						.catch(() => {
							if (active) setPlaylistsVisibility(null);
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
						<div className={styles.nameRow}>
							<h1 className={styles.username}>
								{displayName}
								{!banned &&
									(starred ? (
										<span
											className={styles.starBadge}
											title="Starred Next Music"
										>
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
								<>
									<span className={styles.nameSeparator} aria-hidden="true">
										·
									</span>
									<button
										type="button"
										className={styles.joinDate}
										onClick={() => setExactDate((v) => !v)}
									>
										<LogoIcon size={14} aria-hidden="true" />
										{formatJoinDate(profile.created_at, exactDate)}
									</button>
								</>
							)}
						</div>

						{!banned && <ProfileStatus text={profile.status ?? ""} />}
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
							{(showLikes || showPlaylists) && (
								<div
									className={`${styles.statsCard} ${likesStyles.tabs}`}
									aria-label="Profile sections"
								>
									<button
										type="button"
										aria-pressed={!visiblePlaylistId && visibleTab === "bio"}
										onClick={() => openTab("bio")}
									>
										<UserRound size={16} aria-hidden="true" />
										Bio
									</button>
									{showLikes && (
										<button
											type="button"
											aria-pressed={
												!visiblePlaylistId && visibleTab === "likes"
											}
											onClick={() => openTab("likes")}
										>
											<Heart
												size={16}
												aria-hidden="true"
												fill={
													!visiblePlaylistId && visibleTab === "likes"
														? "currentColor"
														: "none"
												}
											/>
											Liked tracks
										</button>
									)}
									{showPlaylists && (
										<button
											type="button"
											aria-pressed={
												Boolean(visiblePlaylistId) || visibleTab === "playlists"
											}
											onClick={() => openTab("playlists")}
										>
											<ListMusic size={16} aria-hidden="true" />
											Playlists
										</button>
									)}
								</div>
							)}
							{visiblePlaylistId && (
								<PlaylistTracks
									key={`${userId}/${visiblePlaylistId}`}
									userId={userId}
									playlistId={visiblePlaylistId}
								/>
							)}
							{!visiblePlaylistId && visibleTab === "likes" && (
								<PublicLikedTracks key={userId} userId={profile.user_id} />
							)}
							{!visiblePlaylistId && visibleTab === "playlists" && (
								<Card
									as="section"
									variant="modal"
									heading={
										<span className={styles.privacyLabel}>
											<ListMusic size={18} aria-hidden="true" />
											<span>Playlists</span>
										</span>
									}
									className={styles.profileContentCard}
								>
									{allPlaylists?.userId !== userId ? (
										<div className={styles.loadingSmall}>Loading…</div>
									) : allPlaylists.items.length === 0 ? (
										<div className={styles.empty}>No playlists</div>
									) : (
										<div className={styles.playlistGrid}>
											{allPlaylists.items.map((playlist) => (
												<PlaylistCard
													key={playlist.id}
													playlist={playlist}
													userId={userId}
													variant="grid"
												/>
											))}
										</div>
									)}
								</Card>
							)}
							{!visiblePlaylistId && visibleTab === "bio" && (
								<Card
									as="section"
									variant="modal"
									heading={
										<span className={styles.privacyLabel}>
											<UserRound size={18} aria-hidden="true" />
											<span>Bio</span>
										</span>
									}
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
						<div
							className={`${styles.pinnedSection} ${styles.profileRightColumn}`}
						>
							{showPlaylists && (
								<Card as="section" variant="modal" heading="Pinned Playlists">
									{playlists.length === 0 ? (
										<div className={styles.empty}>No pinned playlists</div>
									) : (
										<div className={styles.playlistList}>
											{playlists.map((pl) => (
												<PlaylistCard
													key={pl.id}
													playlist={pl}
													userId={userId}
												/>
											))}
										</div>
									)}
								</Card>
							)}
							<PublicProfileConnections
								key={profile.user_id}
								userId={profile.user_id}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
