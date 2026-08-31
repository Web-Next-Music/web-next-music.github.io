"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./Header.module.scss";
import { useRouter, usePathname } from "next/navigation";
import AuthButton from "@/components/common/AuthButton";
import Menu from "@/components/ui/Menu";
import menuStyles from "@/components/ui/Menu.module.scss";

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
					{ href: "/store", label: "Store" },
					{ href: "/fckcensor-next", label: "FckCensor Next" },
					{ href: "/experiments", label: "Experiments" },
				]),
	];

	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const [useCondemnedLogo, setUseCondemnedLogo] = useState(
		() => seasonalLogoDecided,
	);
	const burgerRef = useRef<HTMLButtonElement>(null);
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

	return (
		<>
			<header className={styles.header}>
				<div className={styles.headerWrap}>
					<div
						className={styles.logo}
						onClick={!isHiddenMode ? () => router.push("/") : undefined}
						style={{
							pointerEvents: isHiddenMode ? "none" : "auto",
						}}
					>
						<div className={styles.logo}>
							<div
								className={styles.logoImg}
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

					<div className={styles.navWrap}>
						<nav className={styles.nav} aria-label="Main navigation">
							{NAV_LINKS.map((l) => (
								<Link
									key={l.href}
									href={l.href}
									className={
										l.href === "/"
											? pathname === "/"
												? styles.active
												: undefined
											: pathname.startsWith(l.href)
												? styles.active
												: undefined
									}
								>
									{l.label}
								</Link>
							))}
						</nav>

						{!isHiddenMode && (
							<div className={styles.headerRight}>
								<AuthButton />
							</div>
						)}

						<div className={styles.burger}>
							<button
								ref={burgerRef}
								className={styles.burgerBtn}
								onClick={() => setOpen((v) => !v)}
								aria-label="Toggle navigation menu"
								aria-expanded={open}
							>
								<span
									className={`${styles.burgerIcon} ${open ? styles.burgerIconOpen : ""}`}
								>
									<span />
									<span />
									<span />
								</span>
							</button>

							<Menu
								open={open}
								onClose={closeMenu}
								anchorRef={burgerRef}
								align="end"
								offset={10}
								minWidth={180}
							>
								{NAV_LINKS.map((l) => (
									<Link
										key={l.href}
										href={l.href}
										className={menuStyles.item}
										onClick={closeMenu}
									>
										{l.label}
									</Link>
								))}
							</Menu>
						</div>
					</div>
				</div>
			</header>
			<div id="mini-player-slot" />
		</>
	);
}
