import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FckCensorTabs from "@/components/fckcensor/FckCensorTabs";
import FckCensorHero from "@/components/fckcensor/FckCensorHero";
import Image from "next/image";
import { Suspense } from "react";
import styles from "./page.module.scss";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "FckCensor Next - Track List",
	description: "List of tracks bypassing Yandex Music censorship",
};

export default function FckCensorPage() {
	return (
		<>
			<Header />
			<main className={styles.main}>
				<FckCensorHero />
				<div className={styles.creditsBlock}>
					<Image
						src="https://avatars.githubusercontent.com/Hazzz895"
						alt="Hazzz895"
						width={48}
						height={48}
						className={styles.creditsAvatar}
					/>
					<div className={styles.creditsInfo}>
						<div className={styles.creditsName}>Special thanks</div>
						<p className={styles.creditsDesc}>
							Special thanks to the original author&nbsp;
							<a
								href="https://github.com/Hazzz895/"
								target="_blank"
								rel="noopener noreferrer"
								className={styles.creditsLink}
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
