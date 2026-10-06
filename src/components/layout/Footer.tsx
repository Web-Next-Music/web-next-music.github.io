"use client";

import { useTheme } from "@/lib/theme";
import Link from "next/link";

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
			<footer
				className={
					"[border-top:1px_solid_var(--border)] [border-bottom:1px_solid_var(--border)]"
				}
			>
				<div
					className={
						"max-w-300 m-[0_auto] p-[40px_40px] grid grid-cols-[1fr_1fr_1fr_1fr] gap-8 [@media(max-width:_768px)]:grid-cols-[1fr_1fr] [@media(max-width:_768px)]:p-[40px_20px]"
					}
				>
					<div
						className={
							"[&_h4]:text-[14px] [&_h4]:font-extrabold [&_h4]:text-muted [&_h4]:tracking-[1px] [&_h4]:mb-3.5 [&_h4]:font-sans [&_a]:block [&_a]:text-[13px] [&_a]:font-bold [&_a]:text-muted [&_a]:mb-2 [&_a]:[transition:color_0.2s] [&_a:hover]:text-foreground"
						}
					>
						<div
							className={
								"text-[16px] font-extrabold [letter-spacing:-0.5px] mb-2"
							}
						>
							{isHiddenMode ? "UGC Share" : "Next Music"}
						</div>
						<p className={"text-[14px] font-bold text-muted leading-[1.6]"}>
							{isHiddenMode
								? "Add-on for sharing UGC tracks from Yandex Music"
								: "Web client for Yandex Music"}
						</p>
					</div>

					<div
						className={
							"[&_h4]:text-[14px] [&_h4]:font-extrabold [&_h4]:text-muted [&_h4]:tracking-[1px] [&_h4]:mb-3.5 [&_h4]:font-sans [&_a]:block [&_a]:text-[13px] [&_a]:font-bold [&_a]:text-muted [&_a]:mb-2 [&_a]:[transition:color_0.2s] [&_a:hover]:text-foreground"
						}
					>
						<h4>PRODUCT</h4>
						{links.product.map((l) => (
							<Link key={l.label} href={l.href}>
								{l.label}
							</Link>
						))}
					</div>

					<div
						className={
							"[&_h4]:text-[14px] [&_h4]:font-extrabold [&_h4]:text-muted [&_h4]:tracking-[1px] [&_h4]:mb-3.5 [&_h4]:font-sans [&_a]:block [&_a]:text-[13px] [&_a]:font-bold [&_a]:text-muted [&_a]:mb-2 [&_a]:[transition:color_0.2s] [&_a:hover]:text-foreground"
						}
					>
						<h4>RESOURCES</h4>
						{links.resources.map((l) => (
							<Link key={l.label} href={l.href}>
								{l.label}
							</Link>
						))}
					</div>

					<div
						className={
							"[&_h4]:text-[14px] [&_h4]:font-extrabold [&_h4]:text-muted [&_h4]:tracking-[1px] [&_h4]:mb-3.5 [&_h4]:font-sans [&_a]:block [&_a]:text-[13px] [&_a]:font-bold [&_a]:text-muted [&_a]:mb-2 [&_a]:[transition:color_0.2s] [&_a:hover]:text-foreground"
						}
					>
						<h4>LINKS</h4>
						{links.links.map((l) => (
							<Link key={l.label} href={l.href}>
								{l.label}
							</Link>
						))}
					</div>
				</div>
			</footer>

			<div
				className={
					"max-w-300 m-[0_auto] p-[16px_40px] flex justify-between items-center gap-4 [&_p]:text-[13px] [&_p]:font-bold [&_p]:text-muted [@media(max-width:_768px)]:p-[16px_20px] [@media(max-width:_768px)]:flex-wrap [@media(max-width:_768px)]:justify-center [@media(max-width:_768px)]:gap-3 [@media(max-width:_768px)]:text-center"
				}
			>
				<p>© 2026 Next Music. MIT License</p>

				<button
					className={
						"flex items-center gap-2 bg-none [border:none] outline-none cursor-pointer p-0 font-(family-name:--font-heading-large) focus-visible:outline-none [&:hover_.toggleLabel]:text-foreground"
					}
					onClick={toggle}
					aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
					title={isDark ? "Switch to light theme" : "Switch to dark theme"}
				>
					<span className="relative flex items-center w-11 h-6 rounded-lg [border:1px_solid_var(--border)] [transition:background_0.25s,border-color_0.25s] [background:var(--surface2)]">
						<span
							className={`absolute left-0.75 w-4.5 h-4.5 rounded-(--radius-full) [background:var(--surface)] [border:1px_solid_var(--border)] flex items-center justify-center text-accent [transition:transform_0.25s_cubic-bezier(0.34,1.56,0.64,1),background_0.25s] ${isDark ? "transform-[translateX(0)]" : "transform-[translateX(20px)]"}`}
						>
							{isDark}
						</span>
					</span>
					<span
						className={
							"[.themeToggle:hover_&]:text-foreground text-[12px] font-bold text-muted [transition:color_0.2s] [user-select:none]"
						}
					>
						{isDark ? "Dark" : "Light"}
					</span>
				</button>

				<p>Made with ♥ for Lucky Star lovers</p>
			</div>
		</>
	);
}
