"use client";

import styles from "./Header.module.scss";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import AuthButton from "@/components/common/AuthButton";
import Dropdown from "@/components/ui/Dropdown";
import dropdownStyles from "@/components/ui/Dropdown.module.scss";
import { useClickOutside } from "@/lib/useClickOutside";

const JUNE = 5;

let seasonalLogoDecided = false;

const seasonalLogoCheck =
	typeof window === "undefined"
		? null
		: fetch("https://www.diram1x.ru/cdn-cgi/trace")
				.then((r) => r.text())
				.then((text) => {
					const country = text.match(/^loc=(.*)$/m)?.[1]?.trim();
					const ts = Number(text.match(/^ts=(.*)$/m)?.[1]);
					const month = Number.isFinite(ts)
						? new Date(ts * 1000).getUTCMonth()
						: NaN;
					seasonalLogoDecided = month === JUNE && !!country && country !== "RU";
					return seasonalLogoDecided;
				})
				.catch(() => false);

export default function Header({
	isHiddenMode = false,
}: {
	isHiddenMode?: boolean;
}) {
	const NAV_LINKS = [
		...(isHiddenMode
			? [
					{ href: "https://discord.gg/ky6bcdy7KA", label: "Discord" },
					{ href: "https://boosty.to/diramix", label: "Boosty" },
					{ href: "https://github.com/Diramix", label: "Github" },
				]
			: [
					{ href: "/", label: "Home" },
					{ href: "/fckcensor-next", label: "FckCensor Next" },
					{ href: "/experiments", label: "Experiments" },
				]),
	];

	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const [useCondemnedLogo, setUseCondemnedLogo] = useState(
		() => seasonalLogoDecided,
	);
	const burgerWrapRef = useRef<HTMLDivElement>(null);
	const router = useRouter();

	useEffect(() => {
		let cancelled = false;
		seasonalLogoCheck?.then((decided) => {
			if (!cancelled && decided) setUseCondemnedLogo(true);
		});

		return () => {
			cancelled = true;
		};
	}, []);

	const closeMenu = () => setOpen(false);
	const isActiveLink = (href: string) =>
		href === "/"
			? pathname === "/"
			: pathname === href || pathname.startsWith(`${href}/`);
	const getLinkColor = (href: string) =>
		isActiveLink(href)
			? "var(--text)"
			: "color-mix(in srgb, var(--text) 70%, var(--muted))";

	useClickOutside(burgerWrapRef, open, closeMenu);

	return (
		<>
			<header
				className={
					"flex items-center p-[10px_0] [border-bottom:1px_solid_var(--border)] sticky top-(--ban-banner-h,0px) [background:var(--bg)] z-(--z-header) h-15 [@media(max-width:_900px)]:p-2.5"
				}
			>
				<div
					className={
						"flex items-center justify-between w-full p-[0_20px] [@media(max-width:_900px)]:p-0"
					}
				>
					<div
						className={
							"font-bold [letter-spacing:-0.5px] flex items-center gap-3.75 font-(family-name:--font-logo) text-[23px] shrink-0 cursor-pointer"
						}
						onClick={!isHiddenMode ? () => router.push("/") : undefined}

						style={{
							pointerEvents: isHiddenMode ? "none" : "auto",
						}}
					>
						<div
							className={
								"font-bold [letter-spacing:-0.5px] flex items-center gap-3.75 font-(family-name:--font-logo) text-[23px] shrink-0 cursor-pointer"
							}
						>
							<div
								className={
									"w-10 h-10 rounded-[10px] bg-cover [border:1px_solid_var(--border)] shrink-0 bg-surface"
								}
								style={{
									backgroundImage: isHiddenMode
										? 'url("/icons/ugcShare.webp")'
										: useCondemnedLogo
											? 'url("/icons/icon-256-condemned.png")'
											: 'url("/icons/icon-256.png")',
								}}
							/>
						</div>
						<div className={styles.logoText}>
							{isHiddenMode ? "UGC Share" : "Next Music"}
						</div>
					</div>

					<div className={"flex flex-row"}>
						<nav
							className={
								"flex [&_a]:text-[15px] [&_a]:p-[6px_14px] [&_a]:rounded-md [&_a]:[border:1px_solid_transparent] [&_a]:[transition:all_0.2s] [&_a]:font-(family-name:--font-heading-large) [&_a]:font-extrabold [&_a]:whitespace-nowrap [&_a:hover]:[background:var(--header)] [&_a[aria-current=page]]:[background:var(--header)] [@media(max-width:_725px)]:hidden"
							}
							aria-label="Main navigation"
						>
							{NAV_LINKS.map((l) => (
								<Link
									key={l.href}
									href={l.href}
									aria-current={isActiveLink(l.href) ? "page" : undefined}
									style={{ color: getLinkColor(l.href) }}
								>
									{l.label}
								</Link>
							))}
						</nav>

						{!isHiddenMode && (
							<div className={"flex items-center ml-2.5"}>
								<AuthButton />
							</div>
						)}

						<div
							className={
								"hidden relative ml-2.5 [@media(max-width:_725px)]:block"
							}
							ref={burgerWrapRef}
						>
							<button
								className={
									"flex items-center justify-center w-9 h-9 bg-none [border:1px_solid_var(--border)] rounded-lg cursor-pointer text-muted [transition:border-color_0.2s,color_0.2s,background_0.2s] hover:border-(--accent-border-strong) hover:text-foreground hover:[background:var(--surface)]"
								}
								onClick={() => setOpen((v) => !v)}
								aria-label="Toggle navigation menu"
								aria-expanded={open}
							>
								<span
									className={`${"flex flex-col gap-1 w-4 [&_span]:block [&_span]:w-full [&_span]:h-0.5 [&_span]:[background:currentColor] [&_span]:rounded-xs [&_span]:origin-center [&_span]:[transition:transform_0.22s_ease,opacity_0.22s_ease,width_0.22s_ease]"} ${open ? "[&_span:nth-child(1)]:transform-[translateY(6px)_rotate(45deg)] [&_span:nth-child(2)]:opacity-0 [&_span:nth-child(2)]:w-0 [&_span:nth-child(3)]:transform-[translateY(-6px)_rotate(-45deg)]" : ""}`}
								>
									<span />

									<span />
									<span />
								</span>
							</button>

							<Dropdown open={open} align="end">
								{NAV_LINKS.map((l) => (
									<Link
										key={l.href}
										href={l.href}
										className={dropdownStyles.item}
										aria-current={isActiveLink(l.href) ? "page" : undefined}
										style={{ color: getLinkColor(l.href) }}
										onClick={closeMenu}
									>
										{l.label}
									</Link>
								))}
							</Dropdown>
						</div>
					</div>
				</div>
			</header>
			<div id="mini-player-slot" />
		</>
	);
}
