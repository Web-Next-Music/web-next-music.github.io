"use client";

import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@components/ui/Select";
import styles from "./ExperimentsView.module.scss";

// Row height (item height + gap) must match the CSS values in experiments.module.scss
const ROW_H = 36;
const ITEM_MIN_W = 280;
const GAP = 6;
const OVERSCAN = 4;

type Platform = "all" | "web" | "ios" | "android" | "other";

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "web", label: "Web/Desktop" },
	{ value: "ios", label: "iOS" },
	{ value: "android", label: "Android" },
	{ value: "other", label: "Other" },
];

function getPlatform(name: string): Platform {
	if (name.startsWith("WebNext")) return "web";
	const lower = name.toLowerCase();
	if (lower.startsWith("ios")) return "ios";
	if (lower.startsWith("android")) return "android";
	return "other";
}

function ExperimentFlag({
	name,
	copied,
	onCopy,
}: {
	name: string;
	copied: boolean;
	onCopy: () => void;
}) {
	const codeRef = useRef<HTMLElement>(null);
	const textRef = useRef<HTMLSpanElement>(null);
	const [containerW, setContainerW] = useState(0);
	const [textW, setTextW] = useState(0);

	useLayoutEffect(() => {
		const code = codeRef.current;
		const text = textRef.current;
		if (!code || !text) return;

		const measure = () => {
			setContainerW(code.clientWidth);
			setTextW(text.scrollWidth);
		};

		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(code);
		return () => ro.disconnect();
	}, [name]);

	const overflows = textW > containerW && containerW > 0;

	return (
		<code
			ref={codeRef}
			className={`${styles.flag} ${copied ? styles.flagCopied : ""}`}
			onClick={onCopy}
			style={
				overflows
					? ({
							"--scroll-end": `${-(textW - containerW)}px`,
						} as React.CSSProperties)
					: undefined
			}
		>
			<span
				ref={textRef}
				className={overflows ? styles.flagTextScroll : styles.flagText}
			>
				{name}
			</span>
		</code>
	);
}

interface Props {
	experiments: string[];
	fetchedAt: string;
}

export default function ExperimentsView({ experiments, fetchedAt }: Props) {
	const [query, setQuery] = useState("");
	const [platform, setPlatform] = useState<Platform>("all");
	const [localDate, setLocalDate] = useState<string | null>(null);

	// Virtual scroll state - right panel is the scroll container
	const rightRef = useRef<HTMLDivElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const [cols, setCols] = useState(3);
	const [scrollY, setScrollY] = useState(0);
	const [viewH, setViewH] = useState(800);
	const [listTop, setListTop] = useState(0);

	useEffect(() => {
		setLocalDate(
			new Date(fetchedAt).toLocaleString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			}),
		);
	}, [fetchedAt]);

	useEffect(() => {
		const scroller = rightRef.current;
		const el = wrapRef.current;
		if (!scroller || !el) return;

		const measure = () => {
			setCols(
				Math.max(1, Math.floor((el.clientWidth + GAP) / (ITEM_MIN_W + GAP))),
			);
			setListTop(
				el.getBoundingClientRect().top -
					scroller.getBoundingClientRect().top +
					scroller.scrollTop,
			);
			setViewH(scroller.clientHeight);
		};
		const onScroll = () => setScrollY(scroller.scrollTop);

		const ro = new ResizeObserver(measure);
		ro.observe(el);
		ro.observe(scroller);
		measure();
		setScrollY(scroller.scrollTop);
		scroller.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			ro.disconnect();
			scroller.removeEventListener("scroll", onScroll);
		};
	}, []);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return experiments.filter(
			(e) =>
				(platform === "all" || getPlatform(e) === platform) &&
				(!q || e.toLowerCase().includes(q)),
		);
	}, [experiments, query, platform]);

	const [copied, setCopied] = useState<string | null>(null);

	const copy = (name: string) => {
		void navigator.clipboard.writeText(name);
		setCopied(name);
		setTimeout(() => setCopied((prev) => (prev === name ? null : prev)), 1000);
	};

	const rows = Math.ceil(filtered.length / cols);
	const relY = Math.max(0, scrollY - listTop);
	const startRow = Math.max(0, Math.floor(relY / ROW_H) - OVERSCAN);
	const endRow = Math.min(rows, Math.ceil((relY + viewH) / ROW_H) + OVERSCAN);
	const visibleItems = filtered.slice(startRow * cols, endRow * cols);
	const spacerTop = startRow * ROW_H;
	const spacerBottom = Math.max(0, (rows - endRow) * ROW_H);

	return (
		<div className={styles.layout}>
			{/* Left sidebar */}
			<aside className={styles.sidebar}>
				<div className={styles.sidebarBlock}>
					<div className={styles.heroTitle}>
						<h1>Experiments</h1>
					</div>
					<p className={styles.heroSub}>
						Yandex Music A/B experiment flags fetched from the API
					</p>
				</div>
				<div className={styles.sidebarBlock}>
					<ul className={styles.platformStats}>
						{(
							[
								{ label: "Total", value: "all" },
								{ label: "Web/Desktop", value: "web" },
								{ label: "iOS", value: "ios" },
								{ label: "Android", value: "android" },
								{ label: "Other", value: "other" },
							] as { label: string; value: Platform }[]
						).map(({ label, value }) => {
							const count =
								value === "all"
									? experiments.length
									: experiments.filter((e) => getPlatform(e) === value).length;
							return (
								<li key={value} className={styles.platformStat}>
									<span className={styles.platformStatLabel}>{label}</span>
									<span className={styles.platformStatCount}>{count}</span>
								</li>
							);
						})}
					</ul>
				</div>
				<div className={styles.sidebarBlock}>
					<span className={styles.fetchLabel}>Last fetched</span>
					<span className={styles.fetchTime}>{localDate ?? fetchedAt}</span>
				</div>
			</aside>

			{/* Right panel: sticky toolbar + scrollable list */}
			<div ref={rightRef} className={styles.right}>
				<div className={styles.toolbar}>
					<SearchInput
						radius="pill"
						size="sm"
						placeholder="Search experiments…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onClear={() => setQuery("")}
						spellCheck={false}
						wrapperClassName={styles.searchWrap}
					/>
					<div className={styles.toolbarRight}>
						{(query || platform !== "all") && (
							<span className={styles.resultCount}>
								{filtered.length} / {experiments.length}
							</span>
						)}
						<Select
							value={platform}
							onChange={setPlatform}
							options={PLATFORM_OPTIONS}
						/>
					</div>
				</div>

				<main className={styles.main}>
					{filtered.length === 0 ? (
						<p className={styles.empty}>
							No experiments match &quot;{query}&quot;
						</p>
					) : (
						<div ref={wrapRef}>
							<div style={{ height: spacerTop }} />
							<ul className={styles.list}>
								{visibleItems.map((name) => (
									<li key={name} className={styles.item}>
										<ExperimentFlag
											name={name}
											copied={copied === name}
											onCopy={() => copy(name)}
										/>
									</li>
								))}
							</ul>
							<div style={{ height: spacerBottom }} />
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
