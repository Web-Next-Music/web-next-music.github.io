"use client";

import Image from "next/image";
import styles from "./AppPreview.module.scss";
import type { CardShellProps } from "@/types/ui";

const STATIC_CARDS = [
	{
		cover:
			"https://avatars.yandex.net/get-music-content/41288/49c611ee.a.51178-1/400x400",
		title: "I Kissed A Girl",
		artist: "Katy Perry",
		elapsed: "2:09",
		total: "3:00",
		progress: 52,
	},
	{
		cover:
			"https://avatars.yandex.net/get-music-content/192707/54d70bf4.a.3719536-2/400x400",
		title: "Style",
		artist: "Taylor Swift",
		elapsed: "1:13",
		total: "3:51",
		progress: 28,
	},
	{
		cover:
			"https://avatars.yandex.net/get-music-content/13449652/3198e9c1.a.32202913-1/400x400",
		title: "Young Girl A",
		artist: "8-Bit Bunker",
		elapsed: "3:39",
		total: "4:01",
		progress: 85,
	},
];

function CardShell({
	delay = 0,
	live,
	statusDot,
	cover,
	title,
	artist,
	timeRow,
}: CardShellProps) {
	return (
		<div
			className={`${styles.card} ${live ? styles.cardLive : ""}`}
			style={{ "--delay": `${delay}s` } as React.CSSProperties}
		>
			<div className={styles.cardHeader}>
				<span className={styles.headerLabel}>Listening to Next Music</span>
				{statusDot ?? <span className={styles.dots}>•••</span>}
			</div>
			<div className={styles.cardBody}>
				{cover}
				<div className={styles.info}>
					<div className={styles.title}>{title}</div>
					<div className={styles.artist}>{artist}</div>
					<div className={styles.timeRow}>{timeRow}</div>
				</div>
			</div>
		</div>
	);
}

function ProgressRow({
	elapsed,
	progress,
	total,
}: {
	elapsed: string;
	progress: number;
	total: string;
}) {
	return (
		<>
			<span>{elapsed}</span>
			<div className={styles.progressBar}>
				<div
					className={styles.progressFill}
					style={{ width: `${progress}%` }}
				/>
			</div>
			<span>{total}</span>
		</>
	);
}

function CoverImg({ src, alt }: { src: string; alt: string }) {
	return (
		<Image
			src={src}
			alt={alt}
			width={56}
			height={56}
			className={styles.cover}
		/>
	);
}

export default function AppPreview() {
	return (
		<div className={styles.stack}>
			{STATIC_CARDS.map((c, i) => (
				<CardShell
					key={i}
					delay={i * 0.08}
					cover={<CoverImg src={c.cover} alt={c.title} />}
					title={c.title}
					artist={c.artist}
					timeRow={
						<ProgressRow
							elapsed={c.elapsed}
							progress={c.progress}
							total={c.total}
						/>
					}
				/>
			))}
		</div>
	);
}
