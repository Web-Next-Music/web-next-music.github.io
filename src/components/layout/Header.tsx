"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./Header.module.scss";
import { useRouter } from "next/navigation";
import AuthButton from "@/components/auth/AuthButton";

const JUNE = 5;

let seasonalLogoDecided = false;

const seasonalLogoCheck =
	typeof window === "undefined"
		? null
		: fetch("https://www.cloudflare.com/cdn-cgi/trace")
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

	const [open, setOpen] = useState(false);
	const [useCondemnedLogo, setUseCondemnedLogo] = useState(
		() => seasonalLogoDecided,
	);
	const burgerRef = useRef<HTMLDivElement>(null);
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

	// Close dropdown when clicking outside
	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (!burgerRef.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	// Close dropdown on Escape
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [open]);

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
						<div className={styles.nav}>
							{NAV_LINKS.map((l) => (
								<Link key={l.href} href={l.href}>
									{l.label}
								</Link>
							))}
						</div>

						{!isHiddenMode && (
							<div className={styles.headerRight}>
								<AuthButton />
							</div>
						)}

						<div ref={burgerRef} className={styles.burger}>
							<button
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

							{open && (
								<div className={styles.dropdown}>
									{NAV_LINKS.map((l) => (
										<Link
											key={l.href}
											href={l.href}
											className={styles.dropdownLink}
											onClick={() => setOpen(false)}
										>
											{l.label}
										</Link>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</header>
			<div id="mini-player-slot" />
		</>
	);
}
