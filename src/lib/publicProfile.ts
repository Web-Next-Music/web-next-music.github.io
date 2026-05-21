import { getSupabase } from "./supabase";
import { config } from "./config";
import type { Playlist } from "./playlists";

export interface UserProfile {
	user_id: string;
	github_id: string | null;
	github_login: string | null;
	display_name: string | null;
	avatar_url: string | null;
	bio: string | null;
	github_starred: boolean;
}

export async function getProfileByGithubId(
	githubId: string,
): Promise<UserProfile | null> {
	const sb = getSupabase();
	if (!sb) return null;
	const { data } = await sb
		.from("user_profiles")
		.select(
			"user_id, github_id, github_login, display_name, avatar_url, bio, github_starred",
		)
		.eq("github_id", githubId)
		.single();
	return (data as UserProfile) ?? null;
}

export async function getProfileByUsername(
	githubLogin: string,
): Promise<UserProfile | null> {
	const sb = getSupabase();
	if (!sb) return null;
	const { data } = await sb
		.from("user_profiles")
		.select(
			"user_id, github_id, github_login, display_name, avatar_url, bio, github_starred",
		)
		.eq("github_login", githubLogin)
		.single();
	return (data as UserProfile) ?? null;
}

export async function getOwnProfile(
	userId: string,
): Promise<UserProfile | null> {
	const sb = getSupabase();
	if (!sb) return null;
	const { data } = await sb
		.from("user_profiles")
		.select(
			"user_id, github_login, display_name, avatar_url, bio, github_starred",
		)
		.eq("user_id", userId)
		.single();
	return (data as UserProfile) ?? null;
}

// Syncs GitHub metadata to user_profiles on login.
// Does NOT overwrite bio - only sets identity fields.
export async function syncGitHubMeta(
	userId: string,
	github_id: string,
	github_login: string,
	display_name: string | null,
	avatar_url: string | null,
): Promise<void> {
	const sb = getSupabase();
	if (!sb) return;
	await sb
		.from("user_profiles")
		.upsert(
			{ user_id: userId, github_id, github_login, display_name, avatar_url },
			{ onConflict: "user_id" },
		);
}

export async function saveBio(userId: string, bio: string): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) return false;
	const { error } = await sb
		.from("user_profiles")
		.upsert(
			{ user_id: userId, bio, updated_at: new Date().toISOString() },
			{ onConflict: "user_id" },
		);
	if (error) console.error("[profile] saveBio:", error.message);
	return !error;
}

export async function getUserPinnedPlaylists(
	userId: string,
): Promise<Playlist[]> {
	const sb = getSupabase();
	if (!sb) return [];
	const { data, error } = await sb
		.from("pinned_playlists")
		.select("position, playlists(id, name, created_at)")
		.eq("user_id", userId)
		.order("position", { ascending: true });
	if (error) {
		console.error("[profile] getPinnedPlaylists:", error.message);
		return [];
	}
	return ((data ?? []) as unknown as { playlists: Playlist }[])
		.map((r) => r.playlists)
		.filter(Boolean);
}

export async function getPinnedPlaylistIds(
	userId: string,
): Promise<Set<string>> {
	const sb = getSupabase();
	if (!sb) return new Set();
	const { data } = await sb
		.from("pinned_playlists")
		.select("playlist_id")
		.eq("user_id", userId);
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
	if (!sb) return false;
	const { error } = await sb
		.from("pinned_playlists")
		.upsert(
			{ user_id: userId, playlist_id: playlistId, position },
			{ onConflict: "user_id,playlist_id" },
		);
	if (error) console.error("[profile] pinPlaylist:", error.message);
	return !error;
}

export async function getUserStats(
	userId: string,
): Promise<{ likes: number; playlists: number }> {
	const sb = getSupabase();
	if (!sb) return { likes: 0, playlists: 0 };
	const { data, error } = await sb.rpc("get_user_stats", { p_user_id: userId });
	if (error) console.error("[profile] getUserStats:", error.message);
	return (
		(data as { likes: number; playlists: number }) ?? { likes: 0, playlists: 0 }
	);
}

export interface PublicProfileResult {
	profile: UserProfile;
	banned: boolean;
}

export async function getPublicProfile(
	githubId: string,
): Promise<PublicProfileResult | null> {
	const sb = getSupabase();
	if (!sb) return null;

	const { data, error } = await sb.rpc("resolve_public_profile", {
		p_github_id: githubId,
	});

	if (error) console.error("[profile] getPublicProfile:", error.message);

	const row = Array.isArray(data) ? data[0] : data;
	if (!row) return null;

	const profile: UserProfile = {
		user_id: row.user_id,
		github_id: row.github_id,
		github_login: row.github_login,
		display_name: row.display_name,
		avatar_url: row.avatar_url,
		bio: row.bio,
		github_starred: row.github_starred,
	};

	return { profile, banned: row.is_banned };
}

// Called when viewing any public profile — syncs github_starred for that github_id via Edge Function.
export async function syncGithubStarForProfile(
	githubId: string,
): Promise<boolean | null> {
	if (!config.supabase.url) return null;
	try {
		const res = await fetch(
			`${config.supabase.url}/functions/v1/sync-github-star?github_id=${encodeURIComponent(githubId)}`,
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

// Calls the Edge Function to verify the GitHub star server-side and update the DB.
// No user token needed — the function reads the github_login from the DB and
// checks the public stargazers list using an optional server-side PAT.
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
	if (!sb) return false;
	const { error } = await sb
		.from("pinned_playlists")
		.delete()
		.eq("user_id", userId)
		.eq("playlist_id", playlistId);
	if (error) console.error("[profile] unpinPlaylist:", error.message);
	return !error;
}
