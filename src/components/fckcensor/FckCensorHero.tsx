"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "@/app/fckcensor-next/page.module.scss";

const FCKCENSOR_REPO = "Web-Next-Music/FckCensor-Next";
const RELEASES_URL = `https://github.com/${FCKCENSOR_REPO}/releases/latest`;

async function fetchReleaseInfo(): Promise<{
	url: string;
	tag: string | null;
}> {
	try {
		const res = await fetch(
			`https://api.github.com/repos/${FCKCENSOR_REPO}/releases?per_page=1`,
		);
		if (res.ok) {
			const releases = await res.json();
			const release = releases[0];
			const asset = release?.assets?.find((a: any) =>
				a.name.endsWith(".user.js"),
			);
			return {
				url: asset?.browser_download_url ?? RELEASES_URL,
				tag: release?.tag_name ?? null,
			};
		}
	} catch {}

	return { url: RELEASES_URL, tag: null };
}

const GitHubIcon = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
		<path
			d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"
			fill="currentColor"
		/>
	</svg>
);

const ScriptIcon = () => (
	<svg
		width="15"
		height="15"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
		<polyline points="14 2 14 8 20 8" />
		<path d="M10 13l-2 2 2 2" />
		<path d="M14 13l2 2-2 2" />
	</svg>
);

export default function FckCensorHero() {
	const [userJsUrl, setUserJsUrl] = useState<string | null>(null);
	const [tag, setTag] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchReleaseInfo()
			.then(({ url, tag }) => {
				setUserJsUrl(url);
				setTag(tag);
			})
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className={styles.addonHero}>
			<Image
				className={styles.addonIcon}
				src="https://raw.githubusercontent.com/Web-Next-Music/FckCensor-Next/refs/heads/main/src/icon.webp"
				width={48}
				height={48}
				alt="addon icon"
			/>
			<div className={styles.addonInfo}>
				<h1 className={styles.addonTitle}>FckCensor Next</h1>
				<p className={styles.addonDesc}>
					This add-on allows bypassing censorship by replacing the MP3 file of
					the currently playing track
				</p>
			</div>
			<div className={styles.addonActions}>
				<a
					href="https://github.com/Web-Next-Music/FckCensor-Next/"
					target="_blank"
					rel="noopener noreferrer"
					className={styles.addonBtn}
				>
					<GitHubIcon />
					GitHub
				</a>
				<a
					href={userJsUrl ?? RELEASES_URL}
					target="_blank"
					rel="noopener noreferrer"
					className={`${styles.addonBtn} ${loading ? styles.addonBtnLoading : ""}`}
					aria-disabled={loading}
				>
					<ScriptIcon />
					Install
				</a>
			</div>
			{tag && <span className={styles.addonVersion}>latest: {tag}</span>}
			<span className={styles.webBadge}>Now available for web</span>
		</div>
	);
}
