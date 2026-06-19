import type { Metadata } from "next";
import { Suspense } from "react";
import ProfilePageClient from "@components/profile/ProfilePageClient";

export const metadata: Metadata = {
	title: "Profile · Next Music",
	description: null,
	openGraph: null,
};

export default function Page() {
	return (
		<Suspense fallback={<div />}>
			<ProfilePageClient />
		</Suspense>
	);
}
