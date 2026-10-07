"use client";

import {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
	type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { cookieStorage } from "../cookieStorage";
import { syncAuthProfile } from "@/lib/supabase/publicProfile";
import { getSessionProvider, type AccountProvider } from "./accountLinks";
import { getBanInfo, type BanInfo } from "./bans";

const GH_TOKEN_KEY = "gh_provider_token";
const GH_TOKEN_USER_KEY = "gh_provider_user";
const BAN_CACHE_KEY = "ban_status_v1";

function getSavedGitHubToken(user: User | null): string | null {
	if (
		!user?.identities?.some((identity) => identity.provider === "github") ||
		sessionStorage.getItem(GH_TOKEN_USER_KEY) !== user.id
	) {
		sessionStorage.removeItem(GH_TOKEN_KEY);
		sessionStorage.removeItem(GH_TOKEN_USER_KEY);
		return null;
	}
	return sessionStorage.getItem(GH_TOKEN_KEY);
}

function getGitHubToken(session: Session | null): string | null {
	const saved = getSavedGitHubToken(session?.user ?? null);
	if (
		session?.user.identities?.some(
			(identity) => identity.provider === "github",
		) &&
		session.provider_token &&
		getSessionProvider(session) === "github"
	) {
		sessionStorage.setItem(GH_TOKEN_KEY, session.provider_token);
		sessionStorage.setItem(GH_TOKEN_USER_KEY, session.user.id);
		return session.provider_token;
	}
	return saved;
}

function readBanCache(userId: string): boolean | null {
	try {
		const raw = sessionStorage.getItem(BAN_CACHE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { uid: string; banned: boolean };
		return parsed.uid === userId ? parsed.banned : null;
	} catch {
		return null;
	}
}

function writeBanCache(userId: string, banned: boolean) {
	try {
		sessionStorage.setItem(
			BAN_CACHE_KEY,
			JSON.stringify({ uid: userId, banned }),
		);
	} catch {}
}

interface AuthContextValue {
	user: User | null;
	session: Session | null;
	githubToken: string | null;
	loading: boolean;
	banChecking: boolean;
	isBanned: boolean;
	banInfo: BanInfo | null;
	signInWithProvider: (provider: AccountProvider) => Promise<string | null>;
	signInWithGitHub: () => Promise<string | null>;
	refreshUser: () => Promise<void>;
	signOut: () => Promise<void>;
	openAuthModal: () => void;
	closeAuthModal: () => void;
	authModalOpen: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
	children,
	devToken,
}: {
	children: ReactNode;
	devToken?: string | null;
}) {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [githubToken, setGithubToken] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [banChecking, setBanChecking] = useState(false);
	const [isBanned, setIsBanned] = useState(false);
	const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
	const [authModalOpen, setAuthModalOpen] = useState(false);

	useEffect(() => {
		const sb = getSupabase();
		if (!sb) {
			setLoading(false);
			return;
		}

		try {
			localStorage.removeItem(GH_TOKEN_KEY);
			cookieStorage.removeItem(GH_TOKEN_KEY);
			cookieStorage.removeItem(GH_TOKEN_USER_KEY);
		} catch {}

		const initialize = async () => {
			if (devToken) {
				const { data: existing } = await sb.auth.getSession();
				if (!existing.session) {
					await sb.auth
						.setSession({ access_token: devToken, refresh_token: "dev" })
						.catch(() => {});
				}
			}

			const { data } = await sb.auth.getSession();
			const s = data.session;
			setSession(s);
			setUser(s?.user ?? null);

			setGithubToken(getGitHubToken(s));

			const u = s?.user;
			if (u) {
				void syncAuthProfile(u).catch((error: unknown) => {
					console.error("[auth] syncAuthProfile:", error);
				});
				const cached = readBanCache(u.id);
				if (cached !== null) {
					setIsBanned(cached);
				} else {
					setBanChecking(true);
				}
				getBanInfo(u.id)
					.then((ban) => {
						const banned = ban !== null;
						setIsBanned(banned);
						setBanInfo(ban);
						writeBanCache(u.id, banned);
					})
					.catch(() => {})
					.finally(() => setBanChecking(false));
			}

			setLoading(false);
		};

		initialize().catch(() => setLoading(false));

		const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
			setSession(session);
			setUser(session?.user ?? null);
			setGithubToken(getGitHubToken(session));

			if (!session) {
				sessionStorage.removeItem(BAN_CACHE_KEY);
				setIsBanned(false);
				setBanInfo(null);
			}

			if (
				(event === "SIGNED_IN" || event === "USER_UPDATED") &&
				session?.user
			) {
				const u = session.user;
				if (event === "SIGNED_IN") setBanChecking(true);
				setTimeout(() => {
					void syncAuthProfile(u).catch((error: unknown) => {
						console.error("[auth] syncAuthProfile:", error);
					});
					if (event === "SIGNED_IN") {
						getBanInfo(u.id)
							.then((ban) => {
								const banned = ban !== null;
								setIsBanned(banned);
								setBanInfo(ban);
								writeBanCache(u.id, banned);
							})
							.catch(() => {})
							.finally(() => setBanChecking(false));
					}
				}, 0);
			}
		});

		return () => listener.subscription.unsubscribe();
	}, [devToken]);

	const signInWithProvider = useCallback(
		async (provider: AccountProvider): Promise<string | null> => {
			const sb = getSupabase();
			if (!sb) return "Supabase is not configured.";
			const { error } = await sb.auth.signInWithOAuth({
				provider,
				options: { redirectTo: window.location.origin },
			});
			return error?.message ?? null;
		},
		[],
	);

	const signInWithGitHub = useCallback(
		() => signInWithProvider("github"),
		[signInWithProvider],
	);

	const refreshUser = useCallback(async (): Promise<void> => {
		const sb = getSupabase();
		if (!sb) throw new Error("Supabase is not configured.");
		const { data, error } = await sb.auth.getUser();
		if (error) throw error;
		setUser(data.user);
		setSession((current) =>
			current && data.user ? { ...current, user: data.user } : null,
		);
		setGithubToken(getSavedGitHubToken(data.user));
	}, []);

	const signOut = useCallback(async () => {
		await getSupabase()?.auth.signOut();
	}, []);

	const openAuthModal = useCallback(() => setAuthModalOpen(true), []);
	const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

	return (
		<AuthContext.Provider
			value={{
				user,
				session,
				githubToken,
				loading,
				banChecking,
				isBanned,
				banInfo,
				signInWithProvider,
				signInWithGitHub,
				refreshUser,
				signOut,
				openAuthModal,
				closeAuthModal,
				authModalOpen,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
