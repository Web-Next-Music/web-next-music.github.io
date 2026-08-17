import type { Metadata } from "next";
import { Suspense } from "react";
import LaSettingsClient from "@/components/la/LaSettingsClient";

export const metadata: Metadata = {
	title: "Listen Along Server Settings",
	description: "Manage a Listen Along server's settings.",
};

export default function Page() {
	return (
		<Suspense fallback={<div />}>
			<LaSettingsClient />
		</Suspense>
	);
}
