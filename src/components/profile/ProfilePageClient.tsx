"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
}: {
	idOverride?: string;
}) {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const router = useRouter();
	const { user, loading } = useAuth();

	const resolvedId =
		idOverride ??
		searchParams.get("id") ??
		pathname?.match(/^\/profile\/([^/]+)\/?$/)?.[1] ??
		"";
	const [id, setId] = useState(resolvedId);
	useEffect(() => {
		if (resolvedId && resolvedId !== id) setId(resolvedId);
	}, [resolvedId, id]);

	useEffect(() => {
		if (!id || idOverride) return;
		if (pathname !== "/profile") return;
		router.replace(`/profile/${id}`);
	}, [id, idOverride, pathname, router]);

	if (!id) return <NotFoundView />;

	return (
		<ProfileShell>
			{loading ? (
				<LoadingDots />
			) : user && id === user.id ? (
				<ProfileClient />
			) : (
				<PublicProfileClient userId={id} />
			)}
		</ProfileShell>
	);
}
