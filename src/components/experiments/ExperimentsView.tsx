"use client";

import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@components/ui/Select";

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
			className={`${"flex items-center w-full h-7.5 font-sans text-[12px] font-bold text-foreground [background:var(--surface)] [border:1px_solid_var(--border)] rounded-sm p-[0_12px] cursor-pointer overflow-hidden max-w-full min-w-0 [transition:border-color_0.6s_ease,color_0.6s_ease] hover:border-(--accent-border-strong) hover:[background:var(--accent-bg-hover)] hover:text-accent hover:[transition:border-color_0.15s,background_0.15s,color_0.15s] [&:hover_.flagTextScroll]:animate-[flag-scroll_3s_0.4s_linear_infinite_alternate]"} ${copied ? "border-[#22c55e] text-[#22c55e] [transition:border-color_0.15s_ease,color_0.15s_ease]" : ""}`}
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
				className={
					overflows
						? "whitespace-nowrap inline-block [.flag:hover_&]:animate-[flag-scroll_3s_0.4s_linear_infinite_alternate]"
						: "whitespace-nowrap overflow-hidden text-ellipsis"
				}
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
		<div
			className={
				"grid grid-cols-[300px_1fr] h-[calc(100vh-var(--mini-player-h)-60px)] overflow-hidden max-w-300 ml-auto mr-auto [border-left:1px_solid_var(--border)] [border-right:1px_solid_var(--border)] [@media(max-width:_600px)]:grid-cols-[1fr] [@media(max-width:_600px)]:grid-rows-[auto_1fr] [@media(max-width:_600px)]:h-auto [@media(max-width:_600px)]:overflow-visible"
			}
		>
			{/* Left sidebar */}
			<aside
				className={
					"[border-right:1px_solid_var(--border)] p-5 flex flex-col gap-0 overflow-hidden min-w-0 [@media(max-width:_600px)]:p-[20px_20px_0]"
				}
			>
				<div
					className={
						"flex flex-col gap-2.5 p-[14px_0] first:pt-0 [&+.sidebarBlock]:[border-top:1px_solid_var(--border)]"
					}
				>
					<div
						className={
							"flex items-center gap-5 flex-wrap [&_h1]:font-(family-name:--font-heading-large) [&_h1]:text-[2rem] [&_h1]:font-extrabold [&_h1]:tracking-[-0.03em] [&_h1]:leading-none"
						}
					>
						<h1>Experiments</h1>
					</div>
					<p
						className={
							"font-sans font-bold text-[13px] text-muted leading-[1.6]"
						}
					>
						Yandex Music A/B experiment flags fetched from the API
					</p>
				</div>
				<div
					className={
						"flex flex-col gap-2.5 p-[14px_0] first:pt-0 [&+.sidebarBlock]:[border-top:1px_solid_var(--border)]"
					}
				>
					<ul className={"[list-style:none] flex flex-col gap-2.5"}>
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
								<li
									key={value}
									className={
										"flex items-center justify-between font-sans text-[12px] font-bold"
									}
								>
									<span className={"text-muted font-extrabold text-[13px]"}>
										{label}
									</span>
									<span
										className={
											"text-foreground [font-variant-numeric:tabular-nums] font-extrabold text-[13px]"
										}
									>
										{count}
									</span>
								</li>
							);
						})}
					</ul>
				</div>
				<div
					className={
						"flex flex-col gap-2.5 p-[14px_0] first:pt-0 [&+.sidebarBlock]:[border-top:1px_solid_var(--border)]"
					}
				>
					<span
						className={
							"font-sans text-[12px] tracking-widest font-extrabold uppercase text-muted"
						}
					>
						Last fetched
					</span>
					<span
						className={"font-sans text-[12px] font-extrabold text-foreground"}
					>
						{localDate ?? fetchedAt}
					</span>
				</div>
			</aside>

			{/* Right panel: sticky toolbar + scrollable list */}
			<div
				ref={rightRef}
				className={
					"flex flex-col overflow-y-auto overflow-x-hidden min-w-0 [@media(max-width:_600px)]:overflow-visible"
				}
			>
				<div
					className={
						"sticky top-0 z-20 [background:var(--bg)] [border-bottom:1px_solid_var(--border)] p-2.5 flex items-center gap-3"
					}
				>
					<SearchInput
						radius="pill"
						size="sm"
						placeholder="Search experiments…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onClear={() => setQuery("")}
						spellCheck={false}
						wrapperClassName={
							"flex-1 [max-width:400px] [@media(max-width:_600px)]:max-w-full"
						}
					/>
					<div className={"ml-auto shrink-0 flex items-center gap-2.5"}>
						{(query || platform !== "all") && (
							<span
								className={
									"font-sans text-[0.62rem] text-muted whitespace-nowrap"
								}
							>
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

				<main className={"p-5 flex-1 [@media(max-width:_600px)]:p-2.5"}>
					{filtered.length === 0 ? (
						<p
							className={
								"font-sans text-[0.78rem] text-muted p-[48px_0] text-center"
							}
						>
							No experiments match &quot;{query}&quot;
						</p>
					) : (
						<div ref={wrapRef}>
							<div style={{ height: spacerTop }} />
							<ul
								className={
									"[list-style:none] grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-1.5 [@media(max-width:_600px)]:grid-cols-[1fr]"
								}
							>
								{visibleItems.map((name) => (
									<li key={name} className={"flex min-w-0 overflow-hidden"}>
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
