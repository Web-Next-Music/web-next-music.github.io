"use client";

import { createClient, type Session, type User } from "@supabase/supabase-js";
import { config } from "@/lib/config";
import { getSupabase } from "@/lib/supabase";

export const AUTH_SERVICES = [
	{ provider: "github", name: "GitHub" },
	{ provider: "discord", name: "Discord" },
	{ provider: "spotify", name: "Spotify" },
] as const;

export type AccountProvider = (typeof AUTH_SERVICES)[number]["provider"];
export interface LinkedAccount {
	provider: AccountProvider;
	identityId: string;
	label: string;
	url: string | null;
}

const TRANSFER_KEY = "nm_account_transfer";
const PROOF_KEY = "nm_account_transfer_proof";
const TRANSFER_TTL = 10 * 60 * 1000;

interface TransferState {
	provider: AccountProvider;
	targetUserId: string;
	startedAt: number;
	sourceUserId?: string;
}

export function isAccountProvider(value: unknown): value is AccountProvider {
	return AUTH_SERVICES.some((service) => service.provider === value);
}

export function getSessionProvider(session: Session): AccountProvider | null {
	const identities = [...(session.user.identities ?? [])].sort(
		(a, b) =>
			Date.parse(b.last_sign_in_at || b.created_at || "1970-01-01") -
			Date.parse(a.last_sign_in_at || a.created_at || "1970-01-01"),
	);
	const provider =
		identities[0]?.provider ?? session.user.app_metadata.provider;
	return isAccountProvider(provider) ? provider : null;
}

export function getPreferredAvatarUrl(user: User): string | null {
	const identities = (user.identities ?? []).filter((identity) =>
		isAccountProvider(identity.provider),
	);
	for (const { provider } of AUTH_SERVICES) {
		for (const identity of identities) {
			if (identity.provider !== provider) continue;
			const data = identity.identity_data;
			for (const value of [data?.avatar_url, data?.picture]) {
				if (typeof value === "string" && value.trim()) return value.trim();
			}
		}
	}
	if (identities.length === 0) {
		for (const value of [
			user.user_metadata?.avatar_url,
			user.user_metadata?.picture,
		]) {
			if (typeof value === "string" && value.trim()) return value.trim();
		}
	}
	return null;
}

export function getLinkedAccounts(user: User): LinkedAccount[] {
	return (user.identities ?? []).flatMap((identity) => {
		if (!isAccountProvider(identity.provider)) return [];
		const provider = identity.provider;
		const data = identity.identity_data ?? {};
		const id = String(data.provider_id ?? data.sub ?? identity.id);
		const label = String(
			data.user_name ??
				data.preferred_username ??
				data.name ??
				data.full_name ??
				id,
		);
		const login = data.user_name ?? data.preferred_username;
		const url =
			provider === "github"
				? typeof login === "string" && /^[a-z\d-]+$/i.test(login)
					? `https://github.com/${encodeURIComponent(login)}`
					: null
				: provider === "discord"
					? /^\d+$/.test(id)
						? `https://discord.com/users/${id}`
						: null
					: `https://open.spotify.com/user/${encodeURIComponent(id)}`;
		return [{ provider, identityId: identity.identity_id, label, url }];
	});
}

export async function getPublicAccountLinks(
	userId: string,
): Promise<LinkedAccount[]> {
	const sb = requireSupabase();
	const { data, error } = await sb.rpc("get_public_account_links", {
		p_user_id: userId,
	});
	if (error) throw error;
	return (data ?? []).filter((row: LinkedAccount) =>
		isAccountProvider(row.provider),
	);
}

function requireSupabase() {
	const sb = getSupabase();
	if (!sb) throw new Error("Supabase is not configured.");
	return sb;
}

let proofClient: ReturnType<typeof createClient> | null = null;

function getProofClient() {
	if (proofClient) return proofClient;
	if (!config.supabase.url || !config.supabase.anonKey)
		throw new Error("Supabase is not configured.");
	proofClient = createClient(config.supabase.url, config.supabase.anonKey, {
		auth: {
			storageKey: PROOF_KEY,
			storage: window.sessionStorage,
			flowType: "pkce",
			persistSession: true,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	});
	return proofClient;
}

function readTransfer(): TransferState | null {
	const raw = sessionStorage.getItem(TRANSFER_KEY);
	if (!raw) return null;
	const value = JSON.parse(raw) as TransferState;
	if (
		!isAccountProvider(value.provider) ||
		!value.targetUserId ||
		!Number.isFinite(value.startedAt) ||
		Date.now() - value.startedAt > TRANSFER_TTL
	) {
		throw new Error(
			"Account verification expired. Cancel and verify ownership again.",
		);
	}
	return value;
}

export async function startAccountLink(
	provider: AccountProvider,
): Promise<void> {
	await cancelAccountTransfer();
	const { error } = await requireSupabase().auth.linkIdentity({
		provider,
		options: {
			redirectTo: `${window.location.origin}/profile?tab=settings&link_provider=${provider}`,
		},
	});
	if (error) throw error;
}

export async function startAccountTransfer(
	provider: AccountProvider,
): Promise<void> {
	const { data, error } = await requireSupabase().auth.getUser();
	if (error || !data.user) throw error ?? new Error("Please sign in again.");
	await cancelAccountTransfer();
	sessionStorage.setItem(
		TRANSFER_KEY,
		JSON.stringify({
			provider,
			targetUserId: data.user.id,
			startedAt: Date.now(),
		} satisfies TransferState),
	);
	const { error: oauthError } = await getProofClient().auth.signInWithOAuth({
		provider,
		options: {
			redirectTo: `${window.location.origin}/auth-link?provider=${provider}`,
		},
	});
	if (oauthError) {
		await cancelAccountTransfer();
		throw oauthError;
	}
}

let callbackPromise: Promise<void> | null = null;
export function completeAccountTransferVerification(): Promise<void> {
	if (callbackPromise) return callbackPromise;
	callbackPromise = (async () => {
		const state = readTransfer();
		if (!state)
			throw new Error(
				"No account verification is pending in this browser tab.",
			);
		const url = new URL(window.location.href);
		const hash = new URLSearchParams(url.hash.slice(1));
		const error =
			url.searchParams.get("error_description") ??
			hash.get("error_description");
		if (error) throw new Error(error);
		if (url.searchParams.get("provider") !== state.provider)
			throw new Error("The verification provider does not match.");
		const code = url.searchParams.get("code");
		if (!code)
			throw new Error("The service did not return a verification code.");
		const { data, error: exchangeError } =
			await getProofClient().auth.exchangeCodeForSession(code);
		if (exchangeError || !data.session?.provider_token)
			throw (
				exchangeError ??
				new Error(
					"The service did not return proof of ownership. Please retry verification.",
				)
			);
		state.sourceUserId = data.session.user.id;
		sessionStorage.setItem(TRANSFER_KEY, JSON.stringify(state));
		window.history.replaceState(null, "", "/auth-link");
	})();
	return callbackPromise;
}

async function transferRequest(confirm: boolean) {
	const state = readTransfer();
	if (!state) return null;
	const sb = requireSupabase();
	const { data: target, error: targetError } = await sb.auth.getUser();
	if (targetError || target.user?.id !== state.targetUserId)
		throw new Error(
			"Sign in to the original profile before transferring this account.",
		);
	const { data: proof } = await getProofClient().auth.getSession();
	if (
		!proof.session?.provider_token ||
		proof.session.user.id !== state.sourceUserId
	)
		throw new Error(
			"Ownership verification is missing. Cancel and verify again.",
		);
	const { data, error } = await sb.functions.invoke("account-transfer", {
		body: {
			provider: state.provider,
			sourceAccessToken: proof.session.access_token,
			providerToken: proof.session.provider_token,
			sourceUserId: state.sourceUserId,
			confirm,
		},
	});
	if (error) {
		if (error.context instanceof Response) {
			const detail = await error.context.json().catch(() => null);
			if (typeof detail?.error === "string") throw new Error(detail.error);
		}
		throw error;
	}
	if (data?.error) throw new Error(data.error);
	return data as {
		provider: AccountProvider;
		sourceUserId: string;
		sourceName: string;
		alreadyLinked?: boolean;
	};
}

export async function getPendingAccountTransfer() {
	if (!readTransfer()) return null;
	const data = await transferRequest(false);
	if (data?.alreadyLinked) {
		await cancelAccountTransfer();
		return null;
	}
	return data;
}

export async function confirmAccountTransfer(): Promise<void> {
	if (!readTransfer()) throw new Error("No account transfer is pending.");
	await transferRequest(true);
	await cancelAccountTransfer();
}

export async function cancelAccountTransfer(): Promise<void> {
	if (sessionStorage.getItem(PROOF_KEY)) {
		await getProofClient()
			.auth.signOut({ scope: "local" })
			.catch(() => {});
	}
	proofClient = null;
	sessionStorage.removeItem(TRANSFER_KEY);
	sessionStorage.removeItem(PROOF_KEY);
	sessionStorage.removeItem(`${PROOF_KEY}-code-verifier`);
	callbackPromise = null;
}

export async function unlinkAccount(provider: AccountProvider): Promise<void> {
	const sb = requireSupabase();
	const { data, error } = await sb.auth.getUser();
	if (error || !data.user) throw error ?? new Error("Please sign in again.");
	if ((data.user.identities?.length ?? 0) <= 1)
		throw new Error("Keep at least one sign-in method connected.");
	const identity = data.user.identities?.find(
		(item) => item.provider === provider,
	);
	if (!identity) throw new Error("This account is not connected.");
	const { error: unlinkError } = await sb.auth.unlinkIdentity(identity);
	if (unlinkError) throw unlinkError;
	const { error: syncError } = await sb.rpc("sync_own_auth_profile");
	if (syncError) throw syncError;
}
