"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { findAsset, formatSize, fetchLatestRelease } from "@/lib/github";
import { useAuth } from "@/lib/auth";
import type { GithubRelease } from "@/types/ui";
import styles from "./Hero.module.scss";
import { config } from "@/lib/config";

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


async function downloadViaBlob(url: string) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Download failed: ${response.status}`);
	const blob = await response.blob();
	const filename = decodeURIComponent(
		new URL(url).pathname.split("/").pop() || "download",
	);
	const objectUrl = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = objectUrl;
	link.download = filename;
	document.body.appendChild(link);
	try {
		link.click();
	} finally {
		link.remove();
		setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
	}
}

export default function DownloadButtons({
	repository = config.github.client.fullName,
}: {
	repository?: string;
}) {
	const fallbackUrl = `https://github.com/${repository}/releases/latest`;
	const { githubToken, loading: authLoading } = useAuth();
	const [release, setRelease] = useState<GithubRelease | null>(null);
	const [loading, setLoading] = useState(true);
	const [downloading, setDownloading] = useState<string | null>(null);
	const downloadInProgress = useRef(false);

	useEffect(() => {
		if (authLoading) return;
		let cancelled = false;
		setRelease(null);
		setLoading(true);
		fetchLatestRelease(githubToken ?? undefined, repository)
			.then((data) => {
				if (!cancelled) setRelease(data as GithubRelease | null);
			})
			.catch(() => {
				if (!cancelled) setRelease(null);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [githubToken, authLoading, repository]);

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
			href: winAsset?.browser_download_url ?? fallbackUrl,
			size: winAsset ? formatSize(winAsset.size) : null,
			iconClass: "win",
			btnClass: "dlBtnWin",
		},
		{
			icon: <AppImageIcon />,
			label: "Linux",
			name: ".AppImage",
			href: appImageAsset?.browser_download_url ?? fallbackUrl,
			size: appImageAsset ? formatSize(appImageAsset.size) : null,
			iconClass: "appimage",
			btnClass: "dlBtnAppimage",
		},
		{
			icon: <DebIcon />,
			label: "Debian",
			name: ".deb",
			href: debAsset?.browser_download_url ?? fallbackUrl,
			size: debAsset ? formatSize(debAsset.size) : null,
			iconClass: "deb",
			btnClass: "dlBtnDeb",
		},
		{
			icon: <PkgIcon />,
			label: "Arch Linux",
			name: ".pkg.tar.zst",
			href: pkgAsset?.browser_download_url ?? fallbackUrl,
			size: pkgAsset ? formatSize(pkgAsset.size) : null,
			iconClass: "pkg",
			btnClass: "dlBtnPkg",
		},
	];

	return (
		<div className={styles.dlSection}>
			<span className={styles.dlSectionLabel}>Download</span>
			<div className={styles.dlGrid}>
				{buttons.map((btn, i) => {
					return (
						<a
							key={i}
							href={btn.href}
							aria-busy={downloading === btn.href}
							onClick={async (e) => {

								if (
									btn.href === fallbackUrl ||
									e.metaKey ||
									e.ctrlKey ||
									e.shiftKey ||
									e.altKey
								)
									return;
								e.preventDefault();
								if (downloadInProgress.current) return;
								downloadInProgress.current = true;
								setDownloading(btn.href);
								try {
									await downloadViaBlob(btn.href);
								} catch {
									window.location.assign(btn.href);
								} finally {
									downloadInProgress.current = false;
									setDownloading(null);
								}
							}}
							className={`${styles.dlBtn} ${styles[btn.btnClass]} ${loading ? styles.dlBtnLoading : ""}`}
						>
							<div className={`${styles.dlIcon} ${styles[btn.iconClass]}`}>
								{btn.icon}
							</div>
							<div className={styles.dlText}>
								<span className={styles.dlLabel}>
									{downloading === btn.href ? "Downloading…" : btn.label}
								</span>
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
	);
}
