"use client";
import React, { useState, useEffect } from "react";
import {
	Blocks,
	Palette,
	Download,
	ArrowLeft,
	Code,
	ExternalLink,
	X,
	File,
} from "lucide-react";
import type { Extension, Tag } from "@/lib/addons/addonCache";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ghFetch, CONTENTS_TTL } from "@/lib/addons/ghRequest";
import styles from "./StoreFeed.module.scss";

const TAG_CLASS: Record<Tag, string> = {
	"Next Music": "tagNm",
	PulseSync: "tagPs",
	Web: "tagWeb",
};

function TagBadge({ tag }: { tag: Tag }) {
	const cls = [styles.tagBadge, styles[TAG_CLASS[tag]]]
		.filter(Boolean)
		.join(" ");
	return <span className={cls}>{tag}</span>;
}

function LogoPlaceholder({ isTheme }: { isTheme: boolean }) {
	return (
		<div className={`${styles.logoPh} ${isTheme ? styles.logoPhTheme : ""}`}>
			{isTheme ? <Palette size={14} /> : <Blocks size={14} />}
		</div>
	);
}

function DownloadModal({
	ext,
	onClose,
}: {
	ext: Extension;
	onClose: () => void;
}) {
	return (
		<div
			className={styles.modalBg}
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className={styles.modalBox}>
				<div className={styles.modalBoxHead}>
					<span className={styles.modalBoxTitle}>Download - {ext.name}</span>
					<button className={styles.modalBoxClose} onClick={onClose}>
						<X size={12} />
					</button>
				</div>
				<div className={styles.modalBoxBody}>
					<div className={styles.downloadOptions}>
						{ext.releaseAssets.map((asset) => {
							const icon = asset.name.toLowerCase().endsWith(".js") ? (
								<Code size={17} />
							) : asset.name.toLowerCase().endsWith(".tar.gz") ||
							  asset.name.toLowerCase().endsWith(".zip") ? (
								<Download size={17} />
							) : (
								<File size={17} />
							);
							return (
								<a
									key={asset.name}
									href={asset.url}
									className={styles.dlOption}
									target="_blank"
									rel="noopener noreferrer"
								>
									<div className={styles.dlOptionIcon}>{icon}</div>
									<div className={styles.dlOptionInfo}>
										<div className={styles.dlOptionLabel}>{asset.name}</div>
									</div>
									<span className={styles.dlOptionBadge}>{asset.ext}</span>
								</a>
							);
						})}
						{ext.downloadZip && (
							<a
								href={ext.downloadZip}
								className={styles.dlOption}
								target="_blank"
								rel="noopener noreferrer"
							>
								<div className={styles.dlOptionIcon}>
									<Download size={17} />
								</div>
								<div className={styles.dlOptionInfo}>
									<div className={styles.dlOptionLabel}>Source ZIP</div>
									<div className={styles.dlOptionSub}>
										Full repository source code
									</div>
								</div>
								<span className={styles.dlOptionBadge}>.zip</span>
							</a>
						)}
						{!ext.releaseAssets.length && !ext.downloadZip && (
							<p className={styles.dlOptionNone}>No downloads available yet.</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export function ExtensionPage({
	ext,
	onBack,
}: {
	ext: Extension;
	onBack: () => void;
}) {
	const [showDl, setShowDl] = useState(false);
	const [showUserJs, setShowUserJs] = useState(false);
	const [userJsContent, setUserJsContent] = useState<string | null>(null);
	const [readme, setReadme] = useState<string | null>(null);
	const [readmeLoading, setReadmeLoading] = useState(false);

	useEffect(() => {
		if (!ext.readmeUrl) return;
		let cancelled = false;
		setReadme(null);
		setReadmeLoading(true);
		ghFetch<string>(ext.readmeUrl, { ttl: CONTENTS_TTL, api: false })
			.then((text) => {
				if (!cancelled) setReadme(text);
			})
			.catch(() => {
				if (!cancelled) setReadme("*Failed to load README.*");
			})
			.finally(() => {
				if (!cancelled) setReadmeLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [ext.readmeUrl]);

	useEffect(() => {
		if (!showUserJs || userJsContent !== null || !ext.userJsUrl) return;
		let cancelled = false;
		ghFetch<string>(ext.userJsUrl, { ttl: CONTENTS_TTL, api: false })
			.then((text) => {
				if (!cancelled) setUserJsContent(text);
			})
			.catch(() => {
				if (!cancelled) setUserJsContent("// Failed to load user.js");
			});
		return () => {
			cancelled = true;
		};
	}, [showUserJs, ext.userJsUrl, userJsContent]);

	useEffect(() => {
		const prev = {
			title: document.title,
			ogTitle: (
				document.querySelector('meta[property="og:title"]') as HTMLMetaElement
			)?.content,
			ogDesc: (
				document.querySelector(
					'meta[property="og:description"]',
				) as HTMLMetaElement
			)?.content,
			ogImg: (
				document.querySelector('meta[property="og:image"]') as HTMLMetaElement
			)?.content,
			twitterCard: (
				document.querySelector('meta[name="twitter:card"]') as HTMLMetaElement
			)?.content,
			twitterImg: (
				document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement
			)?.content,
			twitterTitle: (
				document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement
			)?.content,
		};

		function setMeta(selector: string, attr: string, value: string) {
			let el = document.querySelector(selector) as HTMLMetaElement | null;
			if (!el) {
				el = document.createElement("meta");
				if (selector.includes("property="))
					el.setAttribute("property", selector.match(/property="([^"]+)"/)![1]);
				else el.setAttribute("name", selector.match(/name="([^"]+)"/)![1]);
				document.head.appendChild(el);
			}
			el.setAttribute(attr, value);
		}

		const title = `${ext.name} - Next Music Store`;
		document.title = title;
		setMeta('meta[property="og:title"]', "content", title);
		setMeta(
			'meta[property="og:description"]',
			"content",
			ext.description || `${ext.name} extension for Next Music`,
		);
		if (ext.logo) {
			setMeta('meta[property="og:image"]', "content", ext.logo);
			setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
			setMeta('meta[name="twitter:image"]', "content", ext.logo);
		}
		setMeta('meta[name="twitter:title"]', "content", title);

		return () => {
			document.title = prev.title || "Next Music Store";
			if (prev.ogTitle !== undefined)
				setMeta('meta[property="og:title"]', "content", prev.ogTitle);
			if (prev.ogDesc !== undefined)
				setMeta('meta[property="og:description"]', "content", prev.ogDesc);
			if (prev.ogImg !== undefined)
				setMeta('meta[property="og:image"]', "content", prev.ogImg);
			if (prev.twitterCard !== undefined)
				setMeta('meta[name="twitter:card"]', "content", prev.twitterCard);
			if (prev.twitterImg !== undefined)
				setMeta('meta[name="twitter:image"]', "content", prev.twitterImg);
			if (prev.twitterTitle !== undefined)
				setMeta('meta[name="twitter:title"]', "content", prev.twitterTitle);
		};
	}, [ext]);

	const hasDownload = ext.releaseAssets.length > 0 || !!ext.downloadZip;

	return (
		<div className={styles.extPage}>
			{showDl && <DownloadModal ext={ext} onClose={() => setShowDl(false)} />}

			<div className={styles.extPageBack}>
				<button className={styles.backBtn} onClick={onBack}>
					<ArrowLeft size={14} /> Back to Store
				</button>
			</div>

			<div className={styles.extPageHero}>
				<div className={styles.extPageHeroLeft}>
					{ext.logo ? (
						<img src={ext.logo} alt={ext.name} className={styles.extPageLogo} />
					) : (
						<LogoPlaceholder isTheme={ext.isTheme} />
					)}
					<div className={styles.extPageHeroMeta}>
						<h1 className={styles.extPageName}>{ext.name}</h1>
						{ext.author && (
							<p className={styles.extPageAuthor}>by {ext.author}</p>
						)}
						<div className={styles.extPageTags}>
							{ext.tags.map((t) => (
								<TagBadge key={t} tag={t} />
							))}
						</div>
					</div>
				</div>

				<div className={styles.extPageHeroActions}>
					{ext.repo && (
						<a
							href={ext.repo}
							target="_blank"
							rel="noopener noreferrer"
							className={`${styles.btn} ${styles.btnOutline} ${styles.btnLg}`}
						>
							<ExternalLink size={11} /> Repository
						</a>
					)}
					{hasDownload && (
						<button
							className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
							onClick={() => setShowDl(true)}
						>
							<Download size={17} /> Download
						</button>
					)}
				</div>
			</div>

			{showUserJs && (
				<div className={styles.userjsBlock}>
					<div className={styles.userjsBlockHead}>
						<span className={styles.userjsBlockLabel}>user.js</span>
						<span className={styles.editorModalBadge}>RAW</span>
					</div>
					<pre className={styles.userjsBlockCode}>
						<code>{userJsContent ?? "Loading…"}</code>
					</pre>
				</div>
			)}

			{readmeLoading && (
				<div className={styles.loadingMsg}>
					<span className={styles.spinner} />
					Loading README…
				</div>
			)}

			{readme && !readmeLoading && (
				<div className={styles.readmeSection}>
					<div className={styles.secLabel}>README</div>
					<div className={styles.readmeSectionBody}>
						<MarkdownRenderer text={readme} baseUrl={ext.readmeBaseUrl} />
					</div>
				</div>
			)}
		</div>
	);
}
