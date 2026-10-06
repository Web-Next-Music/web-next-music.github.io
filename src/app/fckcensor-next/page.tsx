import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FckCensorTabs from "@/components/fckcensor/FckCensorTabs";
import FckCensorHero from "@/components/fckcensor/FckCensorHero";
import Image from "next/image";
import { Suspense } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "FckCensor Next - Track List",
	description: "List of tracks bypassing Yandex Music censorship",
};

export default function FckCensorPage() {
	return (
		<>
			<Header />
			<main className="max-w-250 m-[0_auto] p-[calc(20px+var(--mini-player-h))_40px_30px] [@media(max-width:_640px)]:p-[calc(20px+var(--mini-player-h))_20px_25px]">
				<FckCensorHero />
				<div
					className={
						"flex items-start gap-5 [background:var(--surface)] rounded-2xl p-5 mb-5 relative overflow-hidden [border:1px_solid_var(--border)] [@media(max-width:_640px)]:flex-row [@media(max-width:_640px)]:items-start [@media(max-width:_640px)]:p-4 [@media(max-width:_640px)]:gap-3"
					}
				>
					<Image
						src="https://avatars.githubusercontent.com/Hazzz895"
						alt="Hazzz895"
						width={48}
						height={48}
						className={
							"w-12 h-12 rounded-(--radius-full) [border:1px_solid_var(--border)] shrink-0 mt-0.5 object-cover"
						}
					/>
					<div className={"flex-1 min-w-0 [@media(max-width:_640px)]:flex-1"}>
						<div
							className={
								"text-[20px] font-extrabold [letter-spacing:-0.3px] mb-1.5 font-(family-name:--font-heading-large) [@media(max-width:_640px)]:text-[18px]"
							}
						>
							Special thanks
						</div>
						<p
							className={
								"text-[16px] text-muted leading-[1.6] max-w-175 [@media(max-width:_640px)]:text-[13px]"
							}
						>
							Special thanks to the original author&nbsp;
							<a
								href="https://github.com/Hazzz895/"
								target="_blank"
								rel="noopener noreferrer"
								className={
									"text-accent no-underline font-bold [transition:color_0.15s] hover:text-(--accent2)"
								}
							>
								@Hazzz895
							</a>{" "}
							of the &quot;FckCensor&quot; script
						</p>
					</div>
				</div>
				<Suspense fallback={<div />}>
					<FckCensorTabs />
				</Suspense>
			</main>
			<Footer />
		</>
	);
}
