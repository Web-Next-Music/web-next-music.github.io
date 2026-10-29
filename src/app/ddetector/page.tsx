import type { Metadata } from "next";
import Image from "next/image";
import preview from "../../../public/ddetector.png";
import DownloadButtons from "@/components/home/DownloadButtons";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import styles from "./page.module.scss";

export const metadata: Metadata = {
	title: "DDetector — Next Music",
	description:
		"DDetector теперь в отдельном приложении. Скачайте приложение для Windows или Linux.",
};

export default function DDetectorPage() {
	return (
		<>
			<Header />
			<main className={styles.page} aria-label="DDetector">
				<div className={styles.content}>
					<p>
						Веб-версия DDetector больше недоступна. Продолжайте пользоваться
						DDetector в отдельном приложении для Windows и Linux.
					</p>
					<DownloadButtons repository="Web-Next-Music/DDetector" />
				</div>
				<Image
					src={preview}
					alt="Интерфейс приложения DDetector со списком треков и результатами анализа текстов"
					className={styles.preview}
					sizes="(max-width: 800px) 100vw, (max-width: 1200px) 55vw, 620px"
					priority
				/>
			</main>
			<Footer />
		</>
	);
}
