"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NotFoundView from "@/components/not-found/NotFoundView";
import TrackPageClient from "@/components/track/TrackPageClient";
import AddonDetail from "@/components/addon/AddonDetail";
import ProfilePageClient from "./ProfilePageClient";
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

export default function UserProfileRouter() {
	const pathname = usePathname();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Until hydrated on the client we don't yet know the real URL (the static
	// 404.html is prerendered for /_not-found), so show a neutral loader instead
	// of flashing the 404 page before the profile resolves.
	if (!mounted) {
		return (
			<ProfileShell>
				<LoadingDots />
			</ProfileShell>
		);
	}

	const trackMatch = pathname?.match(/^\/track\/([^/]+)\/?$/);
	if (trackMatch) {
		return <TrackPageClient idOverride={decodeURIComponent(trackMatch[1])} />;
	}

	const addonMatch = pathname?.match(/^\/addon\/(.+?)\/?$/);
	if (addonMatch) {
		return (
			<ProfileShell>
				<AddonDetail nameOverride={decodeURIComponent(addonMatch[1])} />
			</ProfileShell>
		);
	}

	const match = pathname?.match(/^\/profile\/([^/]+)\/?$/);
	const id = match ? decodeURIComponent(match[1]) : null;

	if (!id) return <NotFoundView />;

	return <ProfilePageClient idOverride={id} />;
}
