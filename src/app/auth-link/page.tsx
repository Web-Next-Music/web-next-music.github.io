import type { Metadata } from "next";
import AccountLinkCallback from "@/components/common/AccountLinkCallback";

export const metadata: Metadata = {
	title: "Account verification · Next Music",
	robots: { index: false, follow: false },
};

export default function Page() {
	return <AccountLinkCallback />;
}
