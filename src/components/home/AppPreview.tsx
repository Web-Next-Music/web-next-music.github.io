"use client";

import Image from "next/image";
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
			className={`${"[background:var(--surface)] [border:1px_solid_var(--border)] rounded-xl overflow-hidden animate-[slideIn_0.4s_ease_both] [animation-delay:var(--delay,0s)] [transition:border-color_0.2s,transform_0.2s] hover:border-(--accent-border) hover:transform-[translateX(-3px)]"} ${live ? "border-(--accent-border)" : ""}`}
			style={{ "--delay": `${delay}s` } as React.CSSProperties}
		>
			<div
				className={
					"flex items-center justify-between p-[10px_14px_8px] [border-bottom:1px_solid_var(--border)] [background:var(--surface2)]"
				}
			>
				<span className={"text-[11px] font-bold text-muted tracking-[0.1px]"}>
					Listening to Next Music
				</span>
				{statusDot ?? (
					<span
						className={"text-[11px] text-muted tracking-[1px] leading-none"}
					>
						•••
					</span>
				)}
			</div>
			<div className={"flex items-center gap-3 p-[12px_14px]"}>
				{cover}
				<div className={"flex-1 min-w-0"}>
					<div
						className={
							"text-[13px] font-bold whitespace-nowrap overflow-hidden text-ellipsis mb-0.5"
						}
					>
						{title}
					</div>
					<div
						className={
							"text-[11px] text-muted whitespace-nowrap overflow-hidden text-ellipsis mb-2"
						}
					>
						{artist}
					</div>
					<div className={"flex items-center gap-1.5 text-[10px] text-muted"}>
						{timeRow}
					</div>
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
			<div
				className={
					"flex-1 h-0.75 [background:var(--border)] rounded-(--radius-3xs) overflow-hidden"
				}
			>
				<div
					className={
						"h-full [background:linear-gradient(90deg,var(--accent2),var(--accent))] rounded-(--radius-3xs) [transition:width_0.8s_linear]"
					}
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
			className={
				"w-14 h-14 rounded-sm object-cover shrink-0 [border:1px_solid_var(--border)]"
			}
		/>
	);
}

export default function AppPreview() {
	return (
		<div
			className={
				"flex flex-col w-75 gap-2.5 shrink-0 [@media(max-width:_900px)]:w-full"
			}
		>
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
