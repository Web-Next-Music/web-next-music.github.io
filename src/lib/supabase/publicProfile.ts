import type { User } from "@supabase/supabase-js";
import { getSupabase } from ".";
import { collectPages } from "./pagination";
import { config } from "../config";
import type { Playlist } from "./playlists";
import type { TrackLikeMeta } from "./likesContext";

export async function syncAuthProfile(user: User): Promise<void> {
	const sb = getSupabase();
	if (!sb || !user.id) return;
	const { error } = await sb.rpc("sync_own_auth_profile");
	if (error) throw error;
}

export async function getProfileVisibility(userId: string) {
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const { data, error } = await sb
		.from("profile_visibility_settings")
		.select("public_liked_tracks, public_playlists, show_account_links")
		.eq("user_id", userId)
		.maybeSingle();
	if (error) throw error;
	return (
		data ?? {
			public_liked_tracks: true,
			public_playlists: true,
			show_account_links: true,
		}
	);
}

export async function getProfileLikesVisibility(
	userId: string,
): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const { data, error } = await sb
		.from("profile_visibility_settings")
		.select("public_liked_tracks")
		.eq("user_id", userId)
		.maybeSingle();
	if (error) throw error;
	return data?.public_liked_tracks !== false;
}

export async function saveProfileLikesVisibility(
	userId: string,
	enabled: boolean,
): Promise<void> {
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const { error } = await sb
		.from("profile_visibility_settings")
		.upsert(
			{ user_id: userId, public_liked_tracks: enabled },
			{ onConflict: "user_id" },
		);
	if (error) throw error;
}

export async function getProfilePlaylistsVisibility(
	userId: string,
): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const { data, error } = await sb
		.from("profile_visibility_settings")
		.select("public_playlists")
		.eq("user_id", userId)
		.maybeSingle();
	if (error) throw error;
	return data?.public_playlists !== false;
}

export async function saveProfilePlaylistsVisibility(
	userId: string,
	enabled: boolean,
): Promise<void> {
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const { error } = await sb
		.from("profile_visibility_settings")
		.upsert(
			{ user_id: userId, public_playlists: enabled },
			{ onConflict: "user_id" },
		);
	if (error) throw error;
}

export const ACCOUNT_LINKS_VISIBILITY_EVENT = "account-links-visibility-change";

export async function getProfileAccountLinksVisibility(
	userId: string,
): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const { data, error } = await sb
		.from("profile_visibility_settings")
		.select("show_account_links")
		.eq("user_id", userId)
		.maybeSingle();
	if (error) throw error;
	return data?.show_account_links !== false;
}

export async function saveProfileAccountLinksVisibility(
	userId: string,
	enabled: boolean,
): Promise<void> {
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const { error } = await sb
		.from("profile_visibility_settings")
		.upsert(
			{ user_id: userId, show_account_links: enabled },
			{ onConflict: "user_id" },
		);
	if (error) throw error;
	window.dispatchEvent(
		new CustomEvent(ACCOUNT_LINKS_VISIBILITY_EVENT, {
			detail: { userId, enabled },
		}),
	);
}

export interface PublicLikedTrack extends TrackLikeMeta {
	track_id: string;
}

export async function getPublicLikedTracks(
	userId: string,
): Promise<PublicLikedTrack[]> {
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const rows = [];
	let after: string | undefined;
	let afterId: string | undefined;
	for (;;) {
		const { data, error } = await sb.rpc("get_public_liked_tracks_page", {
			p_user_id: userId,
			p_after: after,
			p_after_id: afterId,
			p_limit: 100,
		});
		if (error) throw error;
		const page = data ?? [];
		rows.push(...page);
		if (page.length < 100) break;
		const last = page[page.length - 1];
		after = last.created_at;
		afterId = last.id;
	}
	return rows.map((row) => ({
		track_id: row.track_id,
		title: row.title ?? undefined,
		artist: row.artist ?? undefined,
		cover: row.cover ?? undefined,
		mp3_url: row.mp3_url ?? undefined,
	}));
}

export interface UserProfile {
	user_id: string;
	github_id: string | null;
	github_login: string | null;
	display_name: string | null;
	avatar_url: string | null;
	bio: string | null;
	status: string | null;
	github_starred: boolean;
	created_at?: string | null;
}

export async function getOwnProfile(
	userId: string,
): Promise<UserProfile | null> {
	const sb = getSupabase();
	if (!sb) return null;
	const { data, error } = await sb
		.from("user_profiles")
		.select(
			"user_id, github_id, github_login, display_name, avatar_url, bio, status, github_starred",
		)
		.eq("user_id", userId)
		.single();
	if (error) throw error;
	return data ?? null;
}

export async function getOwnStatus(userId: string): Promise<string> {
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const { data, error } = await sb
		.from("user_profiles")
		.select("status")
		.eq("user_id", userId)
		.maybeSingle();
	if (error) throw error;
	return data?.status ?? "";
}

export async function saveStatus(
	userId: string,
	status: string,
): Promise<string> {
	if (/[\r\n]/.test(status)) throw new Error("Status must be a single line");
	if (Array.from(status).length > 64)
		throw new Error("Status must be at most 64 characters");
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const { data, error } = await sb
		.from("user_profiles")
		.update({ status })
		.eq("user_id", userId)
		.select("status")
		.single();
	if (error) throw error;
	if (!data) throw new Error("Status was not saved");
	return data.status ?? "";
}

export async function saveBio(userId: string, bio: string): Promise<void> {
	if (Array.from(bio).length > 10000)
		throw new Error("Bio must be at most 10000 characters");
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const { data, error } = await sb
		.from("user_profiles")
		.update({ bio })
		.eq("user_id", userId)
		.select("user_id")
		.single();
	if (error) throw error;
	if (!data) throw new Error("Bio was not saved");
}

export async function getUserPinnedPlaylists(
	userId: string,
): Promise<Playlist[]> {
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const { data, error } = await sb
		.from("pinned_playlists")
		.select("position, playlists(id, name, created_at)")
		.eq("user_id", userId)
		.order("position", { ascending: true });
	if (error) throw error;
	return ((data ?? []) as unknown as { playlists: Playlist }[])
		.map((r) => r.playlists)
		.filter(Boolean);
}

export async function getPinnedPlaylistIds(
	userId: string,
): Promise<Set<string>> {
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const { data, error } = await sb
		.from("pinned_playlists")
		.select("playlist_id")
		.eq("user_id", userId);
	if (error) throw error;
	return new Set(
		(data ?? []).map((r: { playlist_id: string }) => r.playlist_id),
	);
}

export async function pinPlaylist(
	userId: string,
	playlistId: string,
	position: number,
): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const { error } = await sb
		.from("pinned_playlists")
		.upsert(
			{ user_id: userId, playlist_id: playlistId, position },
			{ onConflict: "user_id,playlist_id" },
		);
	if (error) throw error;
	return true;
}

export async function getUserStats(
	userId: string,
): Promise<{ likes: number; playlists: number }> {
	const sb = getSupabase();
	if (!sb) return { likes: 0, playlists: 0 };
	const { data, error } = await sb.rpc("get_user_stats", { p_user_id: userId });
	if (error) throw error;
	return (
		(data as { likes: number; playlists: number }) ?? { likes: 0, playlists: 0 }
	);
}

export interface PublicProfileResult {
	profile: UserProfile;
	banned: boolean;
}

export async function getPublicProfileByUserId(
	userId: string,
): Promise<PublicProfileResult | null> {
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");

	const { data, error } = await sb.rpc("resolve_public_profile_by_user_id", {
		p_user_id: userId,
	});

	if (error) throw error;

	const row = Array.isArray(data) ? data[0] : data;
	if (!row) return null;

	const profile: UserProfile = {
		user_id: row.user_id,
		github_id: row.github_id,
		github_login: row.github_login,
		display_name: row.display_name,
		avatar_url: row.avatar_url,
		bio: row.bio,
		status: row.status ?? null,
		github_starred: row.github_starred,
		created_at: row.created_at ?? null,
	};

	return { profile, banned: row.is_banned };
}

export async function syncGithubStarForProfile(
	userId: string,
): Promise<boolean | null> {
	if (!config.supabase.url) return null;
	try {
		const res = await fetch(
			`${config.supabase.url}/functions/v1/sync-github-star?user_id=${encodeURIComponent(userId)}`,
			{
				headers: {
					apikey: config.supabase.anonKey ?? "",
					Authorization: `Bearer ${config.supabase.anonKey ?? ""}`,
				},
			},
		);
		if (!res.ok) return null;
		const json = await res.json();
		return typeof json.starred === "boolean" ? json.starred : null;
	} catch {
		return null;
	}
}

export async function syncGithubStar(): Promise<boolean | null> {
	const sb = getSupabase();
	if (!sb || !config.supabase.url) return null;

	const {
		data: { session },
	} = await sb.auth.getSession();
	if (!session) return null;

	try {
		const res = await fetch(
			`${config.supabase.url}/functions/v1/sync-github-star`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					apikey: config.supabase.anonKey ?? "",
				},
			},
		);
		if (!res.ok) return null;
		const json = await res.json();
		return typeof json.starred === "boolean" ? json.starred : null;
	} catch {
		return null;
	}
}

export async function unpinPlaylist(
	userId: string,
	playlistId: string,
): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) throw new Error("Profile service is unavailable");
	const { data, error } = await sb
		.from("pinned_playlists")
		.delete()
		.eq("user_id", userId)
		.eq("playlist_id", playlistId)
		.select("playlist_id");
	if (error) throw error;
	if (!data?.length) throw new Error("Playlist was not unpinned");
	return true;
}
