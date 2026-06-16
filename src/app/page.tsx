import Header from "@/components/layout/Header";
import Hero from "@/components/home/Hero";
import StarsSection from "@/components/home/StarsSection";
import Footer from "@/components/layout/Footer";
import styles from "./page.module.scss";

export default function Home() {
	return (
		<>
			<Header />
			<main className={styles.main}>
				<div id="download">
					<Hero />
				</div>
			</main>
			<StarsSection />
			<Footer />
		</>
	);
}
