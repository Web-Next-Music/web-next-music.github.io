"use client";

import { useState, useEffect } from "react";
import { config } from "@/lib/config";
import {
	getPublicProfileByUserId,
	getUserPinnedPlaylists,
	getUserStats,
	syncGithubStarForProfile,
	type UserProfile,
} from "@/lib/supabase/publicProfile";
import {
	getPlaylistTracks,
	type Playlist,
	type PlaylistTrack,
} from "@/lib/supabase/playlists";
import { decodeTrackKey } from "@/lib/track/trackKey";
import { findTrackById } from "@/lib/track/trackStore";
import { TRACK_META } from "@/lib/fckcensor";
import { marked } from "marked";
import TrackRow from "@/components/common/TrackRow";
import styles from "./profile.module.scss";

marked.use({ breaks: true, gfm: true } as Parameters<typeof marked.use>[0]);

function renderBio(text: string): string {
	return marked.parse(text) as string;
}

function formatJoinDate(iso: string, exact: boolean): string {
	const d = new Date(iso);
	if (exact) {
		const dd = String(d.getDate()).padStart(2, "0");
		const mm = String(d.getMonth() + 1).padStart(2, "0");
		const yyyy = d.getFullYear();
		return `${mm}/${dd}/${yyyy}`;
	}
	return `Joined ${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
}

function resolveTrackMeta(trackId: string) {
	const meta = TRACK_META[trackId];
	if (meta) return meta;
	const stored = findTrackById(trackId);
	if (stored)
		return { title: stored.title, artist: stored.artist, cover: stored.cover };
	if (!trackId.startsWith("http")) {
		const decoded = decodeTrackKey(trackId);
		if (decoded?.title || decoded?.artist)
			return {
				title: decoded.title,
				artist: decoded.artist,
				cover: decoded.cover,
			};
	}
	return null;
}

function PublicPlaylistSection({ playlist }: { playlist: Playlist }) {
	const [open, setOpen] = useState(false);
	const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (open && tracks.length === 0) {
			setLoading(true);
			getPlaylistTracks(playlist.id).then((data) => {
				setTracks(data);
				setLoading(false);
			});
		}
	}, [open, playlist.id]);

	return (
		<div className={styles.playlistItem}>
			<div className={styles.playlistHeader} onClick={() => setOpen((v) => !v)}>
				<div className={styles.playlistChevron} data-open={open}>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
					>
						<path d="M9 18l6-6-6-6" />
					</svg>
				</div>
				<span className={styles.playlistName}>{playlist.name}</span>
				<span className={styles.playlistCount}>
					{tracks.length > 0 ? `${tracks.length} tracks` : ""}
				</span>
			</div>

			{open && (
				<div className={styles.playlistTracks}>
					{loading ? (
						<div className={styles.loadingSmall}>Loading…</div>
					) : tracks.length === 0 ? (
						<div className={styles.emptySmall}>No tracks</div>
					) : (
						tracks.map((pt, i) => {
							const meta = resolveTrackMeta(pt.track_id);
							const title = meta?.title ?? pt.track_id;
							const artist = meta?.artist ?? "";
							const cover = meta?.cover;
							const mp3_url =
								(!pt.track_id.startsWith("http") && !pt.track_id.endsWith("-e")
									? decodeTrackKey(pt.track_id)?.url
									: undefined) ?? findTrackById(pt.track_id)?.url;
							return (
								<TrackRow
									key={pt.id}
									trackId={pt.track_id}
									index={i}
									title={title}
									artist={artist}
									cover={cover}
									dbMeta={{ title, artist, cover, mp3_url }}
									showLike
								/>
							);
						})
					)}
				</div>
			)}
		</div>
	);
}

export default function PublicProfileClient({ userId }: { userId: string }) {
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

	useEffect(() => {
		getPublicProfileByUserId(userId).then((result) => {
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
				Promise.all([
					getUserStats(result.profile.user_id),
					getUserPinnedPlaylists(result.profile.user_id),
				]).then(([stats, playlists]) => {
					setStats(stats);
					setPlaylists(playlists);
				});

				if (result.profile.github_id) {
					syncGithubStarForProfile(result.profile.github_id).then((s) => {
						if (s !== null) setStarred(s);
					});
				}
			}
		});
		return () => {
			document.title = "Next Music";
		};
	}, [userId]);

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
				<p className={styles.centeredText}>User not found</p>
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
								<img
									src="/avatars/avatar-fallback.png"
									alt="Banned"
									className={styles.avatar}
								/>
							) : profile.avatar_url ? (
								<img
									src={profile.avatar_url}
									alt={displayName}
									className={styles.avatar}
								/>
							) : (
								<div className={styles.avatarPlaceholder}>
									{displayName[0].toUpperCase()}
								</div>
							)}
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
						</div>
						<h1 className={styles.username}>{displayName}</h1>
						{!banned && profile.created_at && (
							<p
								className={styles.joinDate}
								onClick={() => setExactDate((v) => !v)}
							>
								{formatJoinDate(profile.created_at, exactDate)}
							</p>
						)}
					</div>

					{stats && (
						<div className={styles.statsCard}>
							<div className={styles.statItem}>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="17"
									height="15"
									viewBox="0 0 24 24"
									fill="currentColor"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
								</svg>
								<span className={styles.statValue}>{stats.likes}</span>
								<span className={styles.statLabel}>Liked tracks</span>
							</div>
							<div className={styles.statItem}>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="17"
									height="15"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M16 5H3" />
									<path d="M11 12H3" />
									<path d="M11 19H3" />
									<path d="M21 16V5" />
									<circle cx="18" cy="16" r="3" />
								</svg>
								<span className={styles.statValue}>{stats.playlists}</span>
								<span className={styles.statLabel}>Playlists</span>
							</div>
						</div>
					)}
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
					{!banned && profile.bio && (
						<section className={styles.section}>
							<div className={styles.sectionHeader}>
								<h2 className={styles.sectionTitle}>Bio</h2>
							</div>
							<div
								className={styles.bioRendered}
								dangerouslySetInnerHTML={{ __html: renderBio(profile.bio) }}
							/>
							<div className={styles.separator}></div>
						</section>
					)}

					{!banned && (
						<section
							className={styles.section}
							style={profile.bio ? { marginTop: 20 } : undefined}
						>
							<div className={styles.sectionHeader}>
								<h2 className={styles.sectionTitle}>Pinned Playlists</h2>
							</div>
							{playlists.length === 0 ? (
								<div className={styles.empty}>No pinned playlists</div>
							) : (
								<div className={styles.playlistList}>
									{playlists.map((pl) => (
										<PublicPlaylistSection key={pl.id} playlist={pl} />
									))}
								</div>
							)}
						</section>
					)}
				</div>
			</div>
		</div>
	);
}
