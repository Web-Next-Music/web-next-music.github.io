import Header from "@/components/layout/Header";
import Hero from "@/components/home/Hero";
import StarsSection from "@/components/home/StarsSection";
import Footer from "@/components/layout/Footer";
import Background from "@/components/ui/Background";
import styles from "./page.module.scss";

export default function Home() {
	return (
		<>
			<Header />
			<main className={styles.main}>
				<Background
					className={styles.heroBg}
					fade="down"
					fadeStart={45}
					fadeEnd={100}
					patterns={[
						{
							type: "dots",
							size: 48,
							color: "var(--accent)",
							opacity: 0.4,
							angle: 45,
						},
						{ type: "aurora", color: "var(--accent)", opacity: 0.9 },
					]}
				/>
				<div className={styles.heroImage} aria-hidden="true" />
				<div id="download">
					<Hero />
				</div>
			</main>
			<StarsSection />
			<Footer />
		</>
	);
}
