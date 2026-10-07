import assert from "node:assert/strict";
import { test } from "node:test";
import type { Session, User, UserIdentity } from "@supabase/supabase-js";
import {
	getLinkedAccounts,
	getPreferredAvatarUrl,
	getSessionProvider,
} from "../src/lib/auth/accountLinks";

function identity(
	provider: string,
	data: Record<string, unknown>,
	lastSignIn = "2026-10-07T12:00:00Z",
): UserIdentity {
	return {
		id: String(data.sub ?? "provider-id"),
		identity_id: `${provider}-identity`,
		user_id: "fixture-user",
		provider,
		identity_data: data,
		last_sign_in_at: lastSignIn,
		created_at: "2026-01-01T00:00:00Z",
	};
}

function user(
	identities: UserIdentity[],
	metadata: Record<string, unknown> = {},
): User {
	return {
		id: "fixture-user",
		aud: "authenticated",
		created_at: "2026-01-01T00:00:00Z",
		app_metadata: { provider: "github" },
		user_metadata: metadata,
		identities,
	};
}

function session(value: User): Session {
	return {
		user: value,
		access_token: "fixture",
		refresh_token: "fixture",
		expires_in: 3600,
		token_type: "bearer",
	};
}

test("builds verified profile URLs for all three services without exposing email", () => {
	const accounts = getLinkedAccounts(
		user([
			identity("github", {
				sub: "123",
				user_name: "music-listener",
				email: "private@example.invalid",
			}),
			identity("discord", {
				sub: "123456789012345678",
				preferred_username: "Listener",
			}),
			identity("spotify", { sub: "spotify-listener", name: "Music listener" }),
		]),
	);
	assert.deepEqual(
		accounts.map((account) => account.url),
		[
			"https://github.com/music-listener",
			"https://discord.com/users/123456789012345678",
			"https://open.spotify.com/user/spotify-listener",
		],
	);
	assert.equal(
		JSON.stringify(accounts).includes("private@example.invalid"),
		false,
	);
	assert.deepEqual(
		accounts.map((account) => account.identityId),
		["github-identity", "discord-identity", "spotify-identity"],
	);
});

test("does not interpret editable profile metadata as a GitHub identity", () => {
	const accounts = getLinkedAccounts(
		user(
			[
				identity("spotify", { sub: "spotify-id", name: "Listener" }),
				identity("email", {
					sub: "email-id",
					email: "private@example.invalid",
				}),
			],
			{ provider_id: "fake-github", user_name: "fake-login" },
		),
	);
	assert.equal(accounts.length, 1);
	assert.equal(accounts[0].provider, "spotify");
});

test("rejects invalid GitHub and Discord URLs and escapes Spotify identifiers", () => {
	const accounts = getLinkedAccounts(
		user([
			identity("github", {
				sub: "123",
				user_name: "bad/login?redirect=example",
			}),
			identity("discord", { sub: "javascript:alert(1)" }),
			identity("spotify", { sub: "user/name?query" }),
		]),
	);
	assert.equal(accounts[0].url, null);
	assert.equal(accounts[1].url, null);
	assert.equal(
		accounts[2].url,
		"https://open.spotify.com/user/user%2Fname%3Fquery",
	);
});

test("chooses the latest provider, not the account's original provider", () => {
	const current = user([
		identity("github", { sub: "123" }, "2026-10-06T12:00:00Z"),
		identity("spotify", { sub: "spotify-id" }, "2026-10-07T12:00:00Z"),
	]);
	assert.equal(getSessionProvider(session(current)), "spotify");
	assert.equal(current.identities?.[0].provider, "github");
});

test("selects avatar by provider priority instead of last login or identity order", () => {
	const github = identity(
		"github",
		{ sub: "123", avatar_url: "https://example.invalid/github.png" },
		"2026-10-01T12:00:00Z",
	);
	const discord = identity("discord", {
		sub: "456",
		avatar_url: "https://example.invalid/discord.png",
	});
	const spotify = identity("spotify", {
		sub: "spotify-id",
		avatar_url: "https://example.invalid/spotify.png",
	});
	for (const identities of [
		[spotify, discord, github],
		[discord, github, spotify],
		[github, spotify, discord],
	]) {
		assert.equal(
			getPreferredAvatarUrl(
				user(identities, {
					avatar_url: "https://example.invalid/last-login.png",
				}),
			),
			"https://example.invalid/github.png",
		);
	}
	assert.equal(
		getPreferredAvatarUrl(user([spotify, discord])),
		"https://example.invalid/discord.png",
	);
	assert.equal(
		getPreferredAvatarUrl(user([spotify])),
		"https://example.invalid/spotify.png",
	);
});

test("skips missing avatars and supports picture metadata", () => {
	assert.equal(
		getPreferredAvatarUrl(
			user([
				identity("github", { sub: "123", avatar_url: "  " }),
				identity("discord", {
					sub: "456",
					picture: "https://example.invalid/discord.png",
				}),
				identity("spotify", {
					sub: "spotify-id",
					avatar_url: "https://example.invalid/spotify.png",
				}),
			]),
		),
		"https://example.invalid/discord.png",
	);
});

test("does not reuse a detached avatar for a provider without an image", () => {
	assert.equal(
		getPreferredAvatarUrl(
			user([identity("spotify", { sub: "spotify-id" })], {
				avatar_url: "https://example.invalid/old-github.png",
			}),
		),
		null,
	);
	assert.equal(
		getPreferredAvatarUrl(
			user([], { picture: "https://example.invalid/legacy.png" }),
		),
		"https://example.invalid/legacy.png",
	);
});

test("handles missing or unsupported provider identities", () => {
	assert.deepEqual(getLinkedAccounts(user([])), []);
	assert.equal(getSessionProvider(session(user([]))), "github");
	assert.equal(
		getSessionProvider(session(user([identity("email", { sub: "email-id" })]))),
		null,
	);
});
