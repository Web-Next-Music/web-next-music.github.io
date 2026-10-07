"use client";

import { useTheme } from "@/lib/theme";
import Link from "next/link";
import styles from "./Footer.module.scss";

export default function Footer({
	isHiddenMode = false,
}: {
	isHiddenMode?: boolean;
}) {
	const { theme, toggle } = useTheme();
	const isDark = theme === "dark";

	const links = isHiddenMode
		? {
				product: [
					{
						label: "Murder Drones Theme",
						href: "https://github.com/Diramix/Murder-Drones-Theme",
						external: true,
					},
					{
						label: "Vocaloid Miku!",
						href: "https://github.com/diramix/Vocaloid-Miku",
						external: true,
					},
				],
				resources: [
					{
						label: "Boosty",
						href: "https://boosty.to/diramix",
						external: true,
					},
					{
						label: "Github",
						href: "https://github.com/Diramix",
						external: true,
					},
				],
				links: [
					{
						label: "Snowy-Fluffy",
						href: "https://snowyfl.com",
						external: true,
					},
					{
						label: "Discord",
						href: "https://discord.gg/ky6bcdy7KA",
						external: true,
					},
				],
			}
		: {
				product: [
					{ label: "Download", href: "/#download", external: false },
					{
						label: "Changelog",
						href: "https://github.com/Web-Next-Music/Next-Music-Client/releases/latest",
						external: true,
					},
				],
				resources: [
					{
						label: "Wiki",
						href: "https://github.com/Web-Next-Music/Next-Music-Client/wiki",
						external: true,
					},
					{
						label: "Experiments",
						href: "/experiments",
						external: false,
					},
				],
				links: [
					{
						label: "AUR",
						href: "https://aur.archlinux.org/packages/next-music",
						external: true,
					},
					{
						label: "GitHub",
						href: "https://github.com/Web-Next-Music/Next-Music-Client",
						external: true,
					},
					{
						label: "Discord",
						href: "https://discord.gg/ky6bcdy7KA",
						external: true,
					},
					{
						label: "Boosty",
						href: "https://boosty.to/diramix",
						external: true,
					},
				],
			};

	return (
		<>
			<footer className={styles.footer}>
				<div className={styles.contentLayout}>
					<div className={styles.elementStyle}>
						<div className={styles.brand}>
							{isHiddenMode ? "UGC Share" : "Next Music"}
						</div>
						<p className={styles.copy}>
							{isHiddenMode
								? "Add-on for sharing UGC tracks from Yandex Music"
								: "Web client for Yandex Music"}
						</p>
					</div>

					<div className={styles.elementStyle}>
						<h4>PRODUCT</h4>
						{links.product.map((l) => (
							<Link key={l.label} href={l.href}>
								{l.label}
							</Link>
						))}
					</div>

					<div className={styles.elementStyle}>
						<h4>RESOURCES</h4>
						{links.resources.map((l) => (
							<Link key={l.label} href={l.href}>
								{l.label}
							</Link>
						))}
					</div>

					<div className={styles.elementStyle}>
						<h4>LINKS</h4>
						{links.links.map((l) => (
							<Link key={l.label} href={l.href}>
								{l.label}
							</Link>
						))}
					</div>
				</div>
			</footer>

			<div className={styles.bottomLayout}>
				<p>© 2026 Next Music. MIT License</p>

				<button
					className={styles.themeToggleLayout}
					onClick={toggle}
					aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
					title={isDark ? "Switch to light theme" : "Switch to dark theme"}
				>
					<span className={styles.toggleTrackLayout}>
						<span
							className={`${styles.toggleThumbLayout} ${isDark ? styles.elementStyle2 : styles.elementStyle3}`}
						>
							{isDark}
						</span>
					</span>
					<span className={styles.toggleLabelLayout}>
						{isDark ? "Dark" : "Light"}
					</span>
				</button>

				<p>Made with ♥ for Lucky Star lovers</p>
			</div>
		</>
	);
}
