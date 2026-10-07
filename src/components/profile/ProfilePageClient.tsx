"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NotFoundView from "@/components/not-found/NotFoundView";
import ProfileClient from "./ProfileClient";
import PublicProfileClient from "./PublicProfileClient";
import styles from "./profile.module.scss";

function ProfileShell({ children }: { children: React.ReactNode }) {
	return (
		<>
			<Header />
			<main>{children}</main>
			<Footer />
		</>
	);
}

function LoadingDots() {
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

export default function ProfilePageClient({
	idOverride,
	playlistIdOverride,
}: {
	idOverride?: string;
	playlistIdOverride?: string;
}) {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const { user, loading, banChecking } = useAuth();
	const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
	const playlistMatch = pathname?.match(
		new RegExp(`^/(?:profile/)?(${uuid})/(${uuid})/?$`, "i"),
	);
	const profileMatch = pathname?.match(/^\/profile\/([^/]+)\/?$/);
	const id = (
		playlistMatch?.[1] ??
		(profileMatch
			? decodeURIComponent(profileMatch[1])
			: pathname === "/profile"
				? (searchParams.get("id") ?? idOverride ?? "")
				: (idOverride ?? ""))
	).toLowerCase();
	const playlistId = playlistMatch
		? playlistMatch[2].toLowerCase()
		: profileMatch || pathname === "/profile"
			? undefined
			: playlistIdOverride?.toLowerCase();

	useEffect(() => {
		if (!id || pathname !== "/profile") return;
		const query = searchParams.toString();
		window.history.replaceState(
			null,
			"",
			`/profile/${encodeURIComponent(id)}${query ? `?${query}` : ""}`,
		);
	}, [id, pathname, searchParams]);

	if (!id) return <NotFoundView />;

	return (
		<ProfileShell>
			{loading || banChecking ? (
				<LoadingDots />
			) : user && id === user.id.toLowerCase() ? (
				<ProfileClient playlistId={playlistId} />
			) : (
				<PublicProfileClient key={id} userId={id} playlistId={playlistId} />
			)}
		</ProfileShell>
	);
}
