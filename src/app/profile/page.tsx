import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProfileRouter from "@/components/profile/ProfileRouter";

export const metadata: Metadata = {
	openGraph: {
		title: "User Profile - Next Music",
		description:
			"Web client for Yandex Music with support for themes, addons, Discord Rich Presence (RPC) and OBS widget.",
		images: ["/preview.png"],
		type: "profile",
	},
};

export default function ProfilePage() {
	return (
		<>
			<Header />
			<main>
				<Suspense>
					<ProfileRouter />
				</Suspense>
			</main>
			<Footer />
		</>
	);
}
