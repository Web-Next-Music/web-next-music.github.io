import { createClient } from "jsr:@supabase/supabase-js@2";

const REPO_OWNER = "Web-Next-Music";
const REPO_NAME = "Next-Music-Client";
const REPO = `${REPO_OWNER}/${REPO_NAME}`;
const TTL_MS = 10 * 60 * 1000;
const MAX_PAGES = 10;

interface Stargazer {
	login: string;
	avatar_url: string;
	html_url: string;
}

let _cachedToken: { token: string; expiresAt: number } | null = null;

function base64url(data: ArrayBuffer | Uint8Array): string {
	const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
	let str = "";
	for (const b of bytes) str += String.fromCharCode(b);
	return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function makeAppJWT(appId: string, pkcs8Pem: string): Promise<string> {
	const pemBody = pkcs8Pem
		.replace(/-----BEGIN PRIVATE KEY-----/g, "")
		.replace(/-----END PRIVATE KEY-----/g, "")
		.replace(/\\n/g, "\n")
		.replace(/\s+/g, "");

	const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

	const key = await crypto.subtle.importKey(
		"pkcs8",
		der,
		{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
		false,
		["sign"],
	);

	const now = Math.floor(Date.now() / 1000);
	const enc = new TextEncoder();
	const header = base64url(
		enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
	);
	const payload = base64url(
		enc.encode(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId })),
	);
	const sig = await crypto.subtle.sign(
		"RSASSA-PKCS1-v1_5",
		key,
		enc.encode(`${header}.${payload}`),
	);

	return `${header}.${payload}.${base64url(sig)}`;
}

async function getGithubToken(): Promise<string> {
	const appId = Deno.env.get("GITHUB_APP_ID")!;
	const privateKey = Deno.env.get("GITHUB_APP_PRIVATE_KEY")!;
	const installationId = Deno.env.get("GITHUB_APP_INSTALLATION_ID")!;

	if (_cachedToken && Date.now() < _cachedToken.expiresAt - 60_000) {
		return _cachedToken.token;
	}

	const jwt = await makeAppJWT(appId, privateKey);
	const res = await fetch(
		`https://api.github.com/app/installations/${installationId}/access_tokens`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${jwt}`,
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		},
	);

	if (!res.ok) {
		const body = await res.text();
		console.error("[stargazers] installation token error:", res.status, body);
		throw new Error(`GitHub App token error: ${res.status}`);
	}

	const { token, expires_at } = await res.json();
	_cachedToken = { token, expiresAt: new Date(expires_at).getTime() };
	return token;
}

async function fetchStargazers(): Promise<Stargazer[] | null> {
	let ghToken: string;
	const pat = Deno.env.get("GITHUB_STARGAZERS_TOKEN");
	if (pat) {
		ghToken = pat;
	} else {
		try {
			ghToken = await getGithubToken();
		} catch (e) {
			console.error("[stargazers] getGithubToken failed:", e);
			return null;
		}
	}

	const headers: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		Authorization: `Bearer ${ghToken}`,
	};

	const all: Stargazer[] = [];

	for (let page = 1; page <= MAX_PAGES; page++) {
		const res = await fetch(
			`https://api.github.com/repos/${REPO}/stargazers?per_page=100&page=${page}`,
			{ headers },
		);
		if (!res.ok) {
			console.error("[stargazers] github error:", res.status, await res.text());
			return null;
		}
		const list: Stargazer[] = await res.json();
		all.push(
			...list.map((u) => ({
				login: u.login,
				avatar_url: u.avatar_url,
				html_url: u.html_url,
			})),
		);
		if (list.length < 100) break;
	}

	return all;
}

function cors() {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers":
			"authorization, x-client-info, apikey, content-type",
	};
}

function payload(stargazers: Stargazer[], updatedAt: string) {
	return Response.json(
		{ stargazers, count: stargazers.length, updated_at: updatedAt },
		{
			headers: {
				...cors(),
				"Cache-Control": "public, max-age=300",
			},
		},
	);
}

Deno.serve(async (req: Request) => {
	if (req.method === "OPTIONS") return new Response(null, { headers: cors() });

	if (req.method !== "GET") {
		return Response.json(
			{ error: "Method not allowed" },
			{ status: 405, headers: cors() },
		);
	}

	const adminClient = createClient(
		Deno.env.get("SUPABASE_URL")!,
		Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
	);

	const { data: cached } = await adminClient
		.from("github_stargazers_cache")
		.select("data, updated_at")
		.eq("repo", REPO)
		.maybeSingle();

	if (cached && Date.now() - new Date(cached.updated_at).getTime() < TTL_MS) {
		return payload(cached.data as Stargazer[], cached.updated_at);
	}

	const fresh = await fetchStargazers();

	if (!fresh) {
		if (cached) return payload(cached.data as Stargazer[], cached.updated_at);
		return Response.json(
			{ error: "GitHub API error" },
			{ status: 502, headers: cors() },
		);
	}

	const updatedAt = new Date().toISOString();
	const { error } = await adminClient.from("github_stargazers_cache").upsert({
		repo: REPO,
		data: fresh,
		count: fresh.length,
		updated_at: updatedAt,
	});
	if (error) console.error("[stargazers] cache upsert error:", error.message);

	return payload(fresh, updatedAt);
});
