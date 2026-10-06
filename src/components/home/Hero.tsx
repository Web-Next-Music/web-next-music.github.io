"use client";

import styles from "./Hero.module.scss";

import { useEffect, useState } from "react";
import Image from "next/image";
import { marked } from "marked";
import Modal from "@/components/ui/Modal";
import FeatureVideoPlayer from "./FeatureVideoPlayer";
import { findAsset, formatSize, fetchLatestRelease } from "@/lib/github";
import { useAuth } from "@/lib/auth";
import type { GithubRelease } from "@/types/ui";

interface Feature {
	title: string;
	content: string;
	videos: string[];
}

const VIDEO_MARKER_PATTERN = /(<div data-feature-video="\d+"><\/div>)/;

function WindowsIcon() {
	return (
		<Image src="/icons/pkgs/windows.svg" width={18} height={18} alt="windows" />
	);
}

function AppImageIcon() {
	return (
		<Image
			src="/icons/pkgs/appimage.svg"
			width={18}
			height={18}
			alt="AppImage"
		/>
	);
}

function DebIcon() {
	return (
		<Image src="/icons/pkgs/debian.svg" width={18} height={18} alt="debian" />
	);
}

function PkgIcon() {
	return (
		<Image
			src="/icons/pkgs/archlinux.svg"
			width={18}
			height={18}
			alt="pacman"
		/>
	);
}

function downloadViaIframe(url: string) {
	const iframe = document.createElement("iframe");
	iframe.style.display = "none";
	iframe.src = url;

	document.body.appendChild(iframe);

	// через время можно удалить (чтобы не копились)
	setTimeout(() => {
		iframe.remove();
	}, 10000);
}

export default function Hero() {
	const { githubToken, loading: authLoading } = useAuth();
	const [release, setRelease] = useState<GithubRelease | null>(null);
	const [loading, setLoading] = useState(true);
	const [features, setFeatures] = useState<Feature[]>([]);
	const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

	useEffect(() => {
		if (authLoading) return;
		fetchLatestRelease(githubToken ?? undefined)
			.then((data) => setRelease(data as GithubRelease | null))
			.catch(() => setRelease(null))
			.finally(() => setLoading(false));
	}, [githubToken, authLoading]);

	useEffect(() => {
		const controller = new AbortController();

		fetch("/features.md", { signal: controller.signal })
			.then((response) => {
				if (!response.ok) throw new Error("Failed to load features");
				return response.text();
			})
			.then((markdown) => {
				const document = new DOMParser().parseFromString(
					marked.parse(markdown) as string,
					"text/html",
				);
				const parsedFeatures = Array.from(
					document.querySelectorAll("details"),
				).map((details) => {
					const summary = details.querySelector("summary");
					const content = details.cloneNode(true) as HTMLElement;
					const videos: string[] = [];
					content.querySelector("summary")?.remove();
					content
						.querySelectorAll<HTMLAnchorElement>("a[href]")
						.forEach((link) => {
							const href = link.href;
							if (
								!href.startsWith("https://github.com/user-attachments/") ||
								link.textContent?.trim() !== href
							)
								return;

							const marker = document.createElement("div");
							marker.dataset.featureVideo = String(videos.length);
							videos.push(href);
							const parent = link.parentElement;
							if (
								parent?.tagName === "P" &&
								parent.textContent?.trim() === href
							) {
								parent.replaceWith(marker);
							} else {
								link.replaceWith(marker);
							}
						});

					return {
						title: summary?.textContent?.trim() ?? "Feature",
						content: content.innerHTML,
						videos,
					};
				});
				setFeatures(parsedFeatures);
			})
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError")
					return;
				setFeatures([]);
			});

		return () => controller.abort();
	}, []);

	const assets = release?.assets ?? [];

	const winAsset = findAsset(assets, ".exe");
	const debAsset = findAsset(assets, ".deb");
	const appImageAsset = findAsset(assets, ".AppImage");
	const pkgAsset = findAsset(assets, ".pkg.tar.zst");

	const buttons = [
		{
			icon: <WindowsIcon />,
			label: "Windows",
			name: ".exe",
			href: winAsset?.browser_download_url ?? release?.html_url ?? "#",
			size: winAsset ? formatSize(winAsset.size) : null,
			iconClass: "win",
			btnClass: "dlBtnWin",
		},
		{
			icon: <AppImageIcon />,
			label: "Linux",
			name: ".AppImage",
			href: appImageAsset?.browser_download_url ?? release?.html_url ?? "#",
			size: appImageAsset ? formatSize(appImageAsset.size) : null,
			iconClass: "appimage",
			btnClass: "dlBtnAppimage",
		},
		{
			icon: <DebIcon />,
			label: "Debian",
			name: ".deb",
			href: debAsset?.browser_download_url ?? release?.html_url ?? "#",
			size: debAsset ? formatSize(debAsset.size) : null,
			iconClass: "deb",
			btnClass: "dlBtnDeb",
		},
		{
			icon: <PkgIcon />,
			label: "Arch Linux",
			name: ".pkg.tar.zst",
			href: pkgAsset?.browser_download_url ?? release?.html_url ?? "#",
			size: pkgAsset ? formatSize(pkgAsset.size) : null,
			iconClass: "pkg",
			btnClass: "dlBtnPkg",
		},
	];

	return (
		<section className={styles.hero}>
			<div className={styles.heroTop}>
				<div className={styles.heroLeft}>
					<h1 className={styles.title}>Next Music</h1>
					<p className={styles.desc}>
						Web client for Yandex Music with support for themes, addons, Discord
						Rich Presence (RPC) and OBS widget
					</p>
					<div className={styles.dlSection}>
						<span className={styles.dlSectionLabel}>Download</span>
						<div className={styles.dlGrid}>
							{buttons.map((btn, i) => {
								const isDisabled = loading || !btn.href || btn.href === "#";

								return (
									<a
										key={i}
										href={btn.href}
										onClick={(e) => {
											if (isDisabled) return;
											e.preventDefault();
											downloadViaIframe(btn.href);
										}}
										className={`${styles.dlBtn} ${styles[btn.btnClass]} ${loading ? styles.dlBtnLoading : ""}`}
									>
										<div
											className={`${styles.dlIcon} ${styles[btn.iconClass]}`}
										>
											{btn.icon}
										</div>
										<div className={styles.dlText}>
											<span className={styles.dlLabel}>{btn.label}</span>
											<span className={styles.dlName}>
												{btn.name}
												{btn.size && (
													<span className={styles.dlSize}>{btn.size}</span>
												)}
											</span>
										</div>
										<svg
											className={styles.dlArrow}
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
										>
											<path
												d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16"
												stroke="currentColor"
												strokeWidth="1.8"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</a>
								);
							})}
						</div>
					</div>
				</div>
				<div className={styles.heroRight}>
					<div className={styles.previewWrapper}>
						<Image
							src="/preview.png"
							alt="Next Music Client preview"
							width={900}
							height={580}
							className={styles.previewImg}
							priority
						/>
					</div>
				</div>
			</div>
			{features.length > 0 && (
				<div className={styles.featuresSection}>
					<h2 className={styles.featuresTitle}>Feature&apos;s</h2>
					<div className={styles.featuresContent}>
						{features.map((feature) => (
							<button
								key={feature.title}
								type="button"
								className={styles.featureCard}
								onClick={() => setSelectedFeature(feature)}
							>
								<span>{feature.title}</span>
								<span className={styles.featureArrow} aria-hidden="true" />
							</button>
						))}
					</div>
				</div>
			)}
			<Modal
				open={selectedFeature !== null}
				onClose={() => setSelectedFeature(null)}
				title={selectedFeature?.title}
				size="lg"
				bodyClassName={styles.featureModalContent}
			>
				{selectedFeature &&
					selectedFeature.content
						.split(VIDEO_MARKER_PATTERN)
						.map((part, index) => {
							const videoIndex = part.match(
								/^<div data-feature-video="(\d+)"><\/div>$/,
							)?.[1];
							if (videoIndex !== undefined) {
								return (
									<FeatureVideoPlayer
										key={`${selectedFeature.title}-video-${videoIndex}`}
										src={selectedFeature.videos[Number(videoIndex)]}
									/>
								);
							}
							if (!part) return null;
							return (
								<div
									key={`${selectedFeature.title}-content-${index}`}
									dangerouslySetInnerHTML={{ __html: part }}
								/>
							);
						})}
			</Modal>
		</section>
	);
}
