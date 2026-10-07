"use client";

import Image from "next/image";
import LogoIcon from "@/components/common/LogoIcon";
import { Settings, UserRound, Heart, ListMusic } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { navigateProfile } from "@/lib/profile/navigation";

import styles from "./profile.module.scss";
import ProfileStatus from "./ProfileStatus";
import ProfileSettings from "./ProfileSettings";
import { PublicProfileConnections } from "./ProfileConnections";
import PlaylistCard from "./PlaylistCard";
import PlaylistTracks from "./PlaylistTracks";
import PlaylistActions, {
	type PlaylistManagementProps,
} from "./PlaylistActions";
import Card from "@/components/ui/Card";

import { useState, useEffect, useRef } from "react";
import { config } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { getPreferredAvatarUrl } from "@/lib/auth/accountLinks";
import { useLikes } from "@/lib/supabase/likesContext";
import {
	ensureTracksLoaded,
	subscribeStore,
	getStoreSnapshot,
} from "@/lib/track/trackStore";
import { syncGithubStar } from "@/lib/supabase/publicProfile";
import { getPlaylistDetail, type Playlist } from "@/lib/supabase/playlists";
import TrackRow from "@/components/common/TrackRow";

import { useProfileBio } from "@/lib/profile/useProfileBio";
import { useProfileStatus } from "@/lib/profile/useProfileStatus";
import { useProfilePlaylists } from "@/lib/profile/useProfilePlaylists";
import {
	renderBio,
	formatJoinDate,
	resolveTrackMeta,
} from "@/lib/profile/profileHelpers";

function PlaylistSection({
	playlist,
	userId,
	readOnly,
	...management
}: PlaylistManagementProps & {
	playlist: Playlist;
	userId: string;
	readOnly?: boolean;
}) {
	return (
		<PlaylistCard
			playlist={playlist}
			userId={userId}
			variant={readOnly ? "compact" : "grid"}
		>
			{!readOnly && <PlaylistActions playlist={playlist} {...management} />}
		</PlaylistCard>
	);
}

export default function ProfileClient({ playlistId }: { playlistId?: string }) {
	const searchParams = useSearchParams();
	const { user, loading, banChecking, openAuthModal, isBanned } = useAuth();
	const { likedTrackIds, likedMeta } = useLikes();
	const newNameRef = useRef<HTMLInputElement>(null);
	const requestedTab = searchParams.get("tab");
	const initialTab =
		requestedTab === "likes" || requestedTab === "liked"
			? "liked"
			: requestedTab === "playlists" || requestedTab === "settings"
				? requestedTab
				: "bio";
	const [tab, setActiveTab] = useState<
		"bio" | "liked" | "playlists" | "settings" | "playlist"
	>(playlistId ? "playlist" : initialTab);
	const setTab = (nextTab: "bio" | "liked" | "playlists" | "settings") => {
		if (user) {
			navigateProfile(`/profile/${encodeURIComponent(user.id)}?tab=${nextTab}`);
		} else {
			setActiveTab(nextTab);
		}
	};
	useEffect(() => {
		setActiveTab(playlistId ? "playlist" : initialTab);
	}, [playlistId, initialTab]);
	const [, setStoreReady] = useState(() => getStoreSnapshot().loaded);
	const [githubStarred, setGithubStarred] = useState<boolean | null>(null);
	const [starLoading, setStarLoading] = useState(false);
	const [exactDate, setExactDate] = useState(false);
	const status = useProfileStatus(user?.id);

	const {
		bio,
		bioLoading,
		editingBio,
		setEditingBio,
		bioInput,
		setBioInput,
		bioSaving,
		handleSaveBio,
	} = useProfileBio(user?.id);

	const {
		playlists,
		playlistsLoading,
		creating,
		setCreating,
		newName,
		setNewName,
		pinnedIds,
		handleCreatePlaylist,
		handleDeletePlaylist,
		handleRenamePlaylist,
		handleTogglePin,
	} = useProfilePlaylists(user?.id);

	const deleteManagedPlaylist = async (id: string) => {
		if (!user || isBanned)
			throw new Error("Playlist management is unavailable");
		await handleDeletePlaylist(id);
		if (await getPlaylistDetail(user.id, id))
			throw new Error("Playlist was not deleted");
	};
	const renameManagedPlaylist = async (id: string, name: string) => {
		if (!user || isBanned)
			throw new Error("Playlist management is unavailable");
		await handleRenamePlaylist(id, name);
		const updated = await getPlaylistDetail(user.id, id);
		if (updated?.playlist.name !== name)
			throw new Error("Playlist was not renamed");
	};

	useEffect(() => {
		if (getStoreSnapshot().loaded) return;
		const unsub = subscribeStore(() => {
			if (getStoreSnapshot().loaded) setStoreReady(true);
		});
		ensureTracksLoaded();
		return unsub;
	}, []);

	const likedIds = Array.from(likedTrackIds).filter((id) => {
		if (id.startsWith("http://") || id.startsWith("https://")) {
			const m = likedMeta.get(id);
			return !!(m?.title || m?.artist);
		}
		return true;
	});

	const userId = user?.id;

	useEffect(() => {
		if (!userId) return;
		setStarLoading(true);
		syncGithubStar().then((starred) => {
			setStarLoading(false);
			if (starred !== null) setGithubStarred(starred);
		});
	}, [userId]);

	useEffect(() => {
		if (creating) newNameRef.current?.focus();
	}, [creating]);

	if (loading || banChecking) {
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

	if (!user) {
		return (
			<div className={styles.centered}>
				<p className={styles.centeredText}>Sign in to view your profile</p>
				<button className={styles.signInBtn} onClick={openAuthModal}>
					Sign In
				</button>
			</div>
		);
	}

	const avatarUrl = getPreferredAvatarUrl(user);
	const username = (user.user_metadata?.user_name ??
		user.user_metadata?.preferred_username) as string | undefined;
	const displayName = (user.user_metadata?.full_name ??
		user.user_metadata?.name ??
		"Music listener") as string;
	const githubIdentity = user.identities?.find(
		(identity) => identity.provider === "github",
	);
	const githubId = (githubIdentity?.identity_data?.provider_id ??
		githubIdentity?.identity_data?.sub) as string | undefined;

	if (isBanned) {
		return (
			<div className={`${styles.page} ${styles.publicPage}`}>
				<div className={styles.layout}>
					<aside className={styles.sidebar}>
						<div className={styles.userCard}>
							<Image
								src="/avatars/avatar-fallback.png"
								alt="Banned"
								width={88}
								height={88}
								className={styles.avatar}
							/>
							<h1 className={styles.username}>{githubId ?? "?"}</h1>
						</div>
					</aside>
					<div className={styles.content}>
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
							Your account has been banned
						</div>
					</div>
				</div>
			</div>
		);
	}

	const pinnedPlaylists = playlists.filter((pl) => pinnedIds.has(pl.id));
	const orderedPlaylists = [
		...pinnedPlaylists,
		...playlists.filter((pl) => !pinnedIds.has(pl.id)),
	];

	return (
		<div className={`${styles.page} ${styles.profilePage}`}>
			<div className={styles.layout}>
				<aside className={styles.sidebar}>
					<div className={styles.userCard}>
						<div className={styles.avatarWrap}>
							{avatarUrl ? (
								<Image
									src={avatarUrl ?? ""}
									alt={username ?? ""}
									width={88}
									height={88}
									className={styles.avatar}
								/>
							) : (
								<div className={styles.avatarPlaceholder}>
									{(username ?? "?")[0].toUpperCase()}
								</div>
							)}
						</div>
						<div className={styles.nameRow}>
							<h1 className={styles.username}>
								{displayName || username}
								{(starLoading || githubStarred !== null) && (
									<span className={styles.starBadge} aria-hidden="true">
										{starLoading ? (
											<svg
												width="17"
												height="15"
												viewBox="0 0 24 24"
												fill="none"
												className={styles.starSpinner}
											>
												<circle
													cx="12"
													cy="12"
													r="9"
													stroke="currentColor"
													strokeWidth="2.5"
													strokeOpacity="0.25"
												/>
												<path
													d="M21 12a9 9 0 0 0-9-9"
													stroke="currentColor"
													strokeWidth="2.5"
													strokeLinecap="round"
												/>
											</svg>
										) : githubStarred ? (
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
										) : (
											<a
												href={config.github.client.url}
												target="_blank"
												rel="noopener noreferrer"
												title="Star Web-Next-Music/Next-Music-Client on GitHub"
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
										)}
									</span>
								)}
							</h1>
							{user.created_at && (
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
										{formatJoinDate(user.created_at, exactDate)}
									</button>
								</>
							)}
						</div>

						<ProfileStatus text={status.status} editor={status} />
						<div className={styles.headerStats}>
							<div>
								<svg
									aria-hidden="true"
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
								<strong>{likedIds.length}</strong>
								<span>Liked tracks</span>
							</div>
							<div>
								<svg
									aria-hidden="true"
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
								<strong>{playlists.length}</strong>
								<span>Playlists</span>
							</div>
						</div>
					</div>

					<div className={styles.statsCard}>
						<button
							className={`${styles.statItem} ${styles.statTab} ${tab === "bio" ? styles.statItemActive : ""}`}
							onClick={() => setTab("bio")}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
								<circle cx="12" cy="7" r="4" />
							</svg>
							<span className={`${styles.statLabel} ${styles.statLabelGrow}`}>
								Bio
							</span>
						</button>
						<button
							className={`${styles.statItem} ${styles.statTab} ${tab === "liked" ? styles.statItemActive : ""}`}
							onClick={() => setTab("liked")}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill={tab === "liked" ? "currentColor" : "none"}
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
							</svg>
							<span className={styles.statLabel}>Liked tracks</span>
						</button>
						<button
							className={`${styles.statItem} ${styles.statTab} ${tab === "playlists" ? styles.statItemActive : ""}`}
							onClick={() => setTab("playlists")}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
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
							<span className={styles.statLabel}>Playlists</span>
						</button>
					</div>
				</aside>

				<div className={`${styles.pinnedSection} ${styles.profileRightColumn}`}>
					<Card
						as="section"
						variant="modal"
						heading="Pinned Playlists"
						headerActions={
							<button
								className={styles.managePlaylistsBtn}
								onClick={() => setTab("playlists")}
							>
								Manage
								<svg
									width="11"
									height="11"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
									className={styles.chevronInline}
								>
									<path d="M9 18l6-6-6-6" />
								</svg>
							</button>
						}
					>
						{pinnedPlaylists.length === 0 ? (
							<div className={styles.empty}>No pinned playlists</div>
						) : (
							<div className={styles.playlistList}>
								{pinnedPlaylists.map((pl) => (
									<PlaylistSection
										key={pl.id}
										playlist={pl}
										userId={user.id}
										isPinned={true}
										readOnly
										onDelete={deleteManagedPlaylist}
										onRename={renameManagedPlaylist}
										onTogglePin={handleTogglePin}
									/>
								))}
							</div>
						)}
					</Card>
					<PublicProfileConnections userId={user.id} user={user} />
					<div className={styles.statsCard}>
						<button
							type="button"
							className={`${styles.statItem} ${styles.statTab} ${tab === "settings" ? styles.statItemActive : ""}`}
							aria-pressed={tab === "settings"}
							onClick={() => setTab("settings")}
						>
							<Settings size={16} aria-hidden="true" />
							<span className={styles.settingsLabel}>Profile settings</span>
						</button>
					</div>
				</div>
				<div className={styles.content}>
					{tab === "playlist" && playlistId && (
						<PlaylistTracks
							key={playlistId}
							userId={user.id}
							playlistId={playlistId}
							management={
								!isBanned
									? {
											isPinned: pinnedIds.has(playlistId),
											onRename: renameManagedPlaylist,
											onDelete: async (id) => {
												await deleteManagedPlaylist(id);
												navigateProfile(
													`/profile/${encodeURIComponent(user.id)}?tab=playlists`,
												);
											},
											onTogglePin: handleTogglePin,
										}
									: undefined
							}
						/>
					)}
					{tab === "settings" && (
						<ProfileSettings
							key={user.id}
							userId={user.id}
							disabled={isBanned}
						/>
					)}
					{tab === "bio" &&
						(() => {
							return (
								<>
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
										headerActions={
											<>
												{" "}
												{!editingBio && !isBanned && (
													<button
														className={styles.newPlaylistBtn}
														onClick={() => {
															setBioInput(bio);
															setEditingBio(true);
														}}
													>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															width="12"
															height="12"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															strokeWidth="2"
															strokeLinecap="round"
															strokeLinejoin="round"
														>
															<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
															<path d="m15 5 4 4" />
														</svg>
														{bio ? "Edit bio" : "Add bio"}
													</button>
												)}
											</>
										}
									>
										{editingBio ? (
											<div className={styles.bioEditArea}>
												<textarea
													className={styles.bioTextarea}
													value={bioInput}
													onChange={(e) => setBioInput(e.target.value)}
													placeholder="Write something about yourself… (Markdown supported)"
													rows={6}
													autoFocus
												/>
												<div className={styles.bioBtnRow}>
													<button
														className={styles.bioCancel}
														onClick={() => setEditingBio(false)}
														disabled={bioSaving}
													>
														Cancel
													</button>
													<button
														className={styles.bioSave}
														onClick={handleSaveBio}
														disabled={bioSaving}
													>
														{bioSaving ? "Saving…" : "Save"}
													</button>
												</div>
											</div>
										) : bioLoading ? (
											<div className={styles.bioSkeleton}>
												<span
													className={`${styles.skeletonLine} ${styles.skeletonLine72}`}
												/>
												<span
													className={`${styles.skeletonLine} ${styles.skeletonLine55}`}
												/>
												<span
													className={`${styles.skeletonLine} ${styles.skeletonLine64}`}
												/>
											</div>
										) : bio ? (
											<div
												className={styles.bioRendered}
												dangerouslySetInnerHTML={{ __html: renderBio(bio) }}
											/>
										) : (
											<div className={styles.empty}>
												No bio yet. Click <strong>Add bio</strong> to write
												something
											</div>
										)}
									</Card>
								</>
							);
						})()}

					{tab === "liked" && (
						<Card
							as="section"
							variant="modal"
							heading={
								<span className={styles.privacyLabel}>
									<Heart size={18} aria-hidden="true" />
									<span>Liked Tracks</span>
								</span>
							}
							className={styles.profileContentCard}
							headerActions={
								likedIds.length > 0 && (
									<span className={styles.sectionCount}>{likedIds.length}</span>
								)
							}
						>
							{likedIds.length === 0 ? (
								<div className={styles.empty}>No liked tracks yet</div>
							) : (
								<div className={styles.trackList}>
									{likedIds.map((id, i) => {
										const meta = resolveTrackMeta(id, likedMeta);
										const dbMeta = likedMeta.get(id);
										return (
											<TrackRow
												key={id}
												trackId={id}
												index={i}
												title={meta?.title ?? `Track #${id}`}
												artist={meta?.artist}
												cover={meta?.cover}
												dbMeta={dbMeta}
												playlists={playlists}
												showLike
											/>
										);
									})}
								</div>
							)}
						</Card>
					)}

					{tab === "playlists" && (
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
							headerActions={
								<>
									{playlists.length > 0 && (
										<span className={styles.sectionCount}>
											{playlists.length}
										</span>
									)}
									<button
										className={styles.newPlaylistBtn}
										onClick={() => !isBanned && setCreating(true)}
										disabled={isBanned}
										title={isBanned ? "Your account is banned" : undefined}
										style={
											isBanned
												? { opacity: 0.4, cursor: "not-allowed" }
												: undefined
										}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="17"
											height="17"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<path d="M5 12h14" />
											<path d="M12 5v14" />
										</svg>
										New Playlist
									</button>
								</>
							}
						>
							{creating && (
								<div className={styles.createRow}>
									<input
										ref={newNameRef}
										className={styles.createInput}
										placeholder="Playlist name…"
										value={newName}
										onChange={(e) => setNewName(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") handleCreatePlaylist();
											if (e.key === "Escape") {
												setCreating(false);
												setNewName("");
											}
										}}
									/>
									<button
										className={styles.createConfirm}
										onClick={handleCreatePlaylist}
									>
										Create
									</button>
									<button
										className={styles.createCancel}
										onClick={() => {
											setCreating(false);
											setNewName("");
										}}
									>
										Cancel
									</button>
								</div>
							)}

							{playlistsLoading ? (
								<div className={styles.playlistSkeleton}>
									{[72, 58, 65].map((w, i) => (
										<div key={i} className={styles.playlistSkeletonRow}>
											<span
												className={styles.skeletonLine}
												style={{ width: `${w}%` }}
											/>
										</div>
									))}
								</div>
							) : playlists.length === 0 && !creating ? (
								<div className={styles.empty}>No playlists yet</div>
							) : (
								<div className={styles.playlistGrid}>
									{orderedPlaylists.map((pl) => (
										<PlaylistSection
											key={pl.id}
											playlist={pl}
											userId={user.id}
											isPinned={pinnedIds.has(pl.id)}
											readOnly={isBanned}
											onDelete={deleteManagedPlaylist}
											onRename={renameManagedPlaylist}
											onTogglePin={handleTogglePin}
										/>
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
