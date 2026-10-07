import type { Metadata } from "next";
import {
	Montserrat,
	Nunito,
	Quicksand,
	Space_Mono,
	Syne,
} from "next/font/google";
import { Suspense } from "react";
import { ThemeProvider } from "@/lib/theme";
import { PlayerProvider } from "@/lib/miniplayer";
import { AuthProvider } from "@/lib/auth";
import { LikesProvider } from "@/lib/supabase/likesContext";
import AuthModal from "@/components/common/AuthModal";
import BanBanner from "@/components/layout/BanBanner";
import { AppWrapper } from "@/components/layout/AppWrapper";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import "./globals.scss";

export const metadata: Metadata = {
	metadataBase: new URL("https://nm.diram1x.ru"),
	title: "Next Music",
	description:
		"Web client for Yandex Music with support for themes, addons, Discord Rich Presence (RPC) and OBS widget.",
	openGraph: {
		title: "Next Music",
		description:
			"Web client for Yandex Music with support for themes, addons, Discord Rich Presence (RPC) and OBS widget",
		images: ["/ui/preview.png"],
		type: "website",
	},
};

const securityPolicy = [
	"default-src 'self'",
	"base-uri 'self'",
	"object-src 'none'",
	"form-action 'self'",
	"frame-ancestors 'none'",
	"script-src 'self' 'unsafe-inline'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob: https:",
	"media-src 'self' blob: https:",
	"connect-src 'self' https:",
	"font-src 'self' data: https://fonts.gstatic.com",
	"frame-src 'self' https://accounts.spotify.com https://discord.com",
].join("; ");

const nunito = Nunito({
	subsets: ["latin", "cyrillic"],
	variable: "--font-nunito",
	display: "swap",
});

const syne = Syne({
	subsets: ["latin"],
	weight: ["400", "500", "700"],
	variable: "--font-syne",
	display: "swap",
});

const quicksand = Quicksand({
	subsets: ["latin"],
	weight: ["400", "500", "700"],
	variable: "--font-quicksand",
	display: "swap",
});

const spaceMono = Space_Mono({
	subsets: ["latin"],
	weight: ["400", "700"],
	style: ["normal", "italic"],
	variable: "--font-space-mono",
	display: "swap",
});

const montserrat = Montserrat({
	subsets: ["latin", "cyrillic"],
	weight: ["400", "500", "700"],
	variable: "--font-montserrat",
	display: "swap",
});

const devAuthToken =
	process.env.NODE_ENV === "development"
		? (process.env.SUPABASE_AUTH_TOKEN ?? null)
		: null;

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="en"
			className={`${nunito.variable} ${quicksand.variable} ${syne.variable} ${spaceMono.variable} ${montserrat.variable}`}
			suppressHydrationWarning
		>
			<body suppressHydrationWarning>
				<meta httpEquiv="Content-Security-Policy" content={securityPolicy} />
				<AuthProvider devToken={devAuthToken}>
					<LikesProvider>
						<ThemeProvider>
							<AppWrapper>
								<BanBanner />
								<ErrorBoundary>
									<Suspense fallback={<>{children}</>}>
										<PlayerProvider>{children}</PlayerProvider>
									</Suspense>
								</ErrorBoundary>
							</AppWrapper>
						</ThemeProvider>
						<AuthModal />
					</LikesProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
