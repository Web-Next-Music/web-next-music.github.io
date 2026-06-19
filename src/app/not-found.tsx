import type { Metadata } from "next";
import UserProfileRouter from "@/components/profile/UserProfileRouter";

export const metadata: Metadata = {
	title: "Next Music",
	description: null,
	openGraph: null,
};

export default function NotFound() {
	return <UserProfileRouter />;
}
