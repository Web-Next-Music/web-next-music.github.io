"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
	Blocks,
	Palette,
	Download,
	ArrowLeft,
	Search,
	Globe,
	Code,
	ExternalLink,
	X,
	File,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import styles from "./StoreFeed.module.scss";
import { Extension, Tag } from "@/lib/addons/addonCache";
import type { CalloutType } from "@/types/addon";
import { useExtensions } from "@/lib/store/useExtensions";
import { useStoreNavigation, extSlug } from "@/lib/store/useStoreNavigation";

const ALL_TAGS: Tag[] = ["Next Music", "PulseSync", "Web"];

const TAG_CLASS: Record<Tag, string> = {
	"Next Music": "tagNm",
	PulseSync: "tagPs",
	Web: "tagWeb",
};

const CLIENT_LABELS: Record<string, string> = {
	nm: "Next Music",
	ps: "PulseSync",
	web: "Web",
};

function matchSearch(ext: Extension, query: string, activeTags: Tag[]) {
	const q = query.toLowerCase();
	return (
		(!q || ext.name.toLowerCase().includes(q)) &&
		(activeTags.length === 0 || activeTags.every((t) => ext.tags.includes(t)))
	);
}

function resolveImgUrl(src: string, baseUrl?: string): string {
	if (!src || /^https?:\/\//i.test(src)) return src;
	return baseUrl ? baseUrl.replace(/\/?$/, "/") + src.replace(/^\//, "") : src;
}

const IconBlocks = () => <Blocks size={14} />;
const IconPalette = () => <Palette size={14} />;
const IconDownload = () => <Download size={17} />;
const IconArrowLeft = () => <ArrowLeft size={14} />;
const IconSearch = () => <Search size={14} />;
const IconGlobe = () => <Globe size={12} />;
const IconCode = () => <Code size={17} />;
const IconExternalLink = () => <ExternalLink size={11} />;
const IconX = () => <X size={12} />;
const IconFile = () => <File size={17} />;

function renderInline(
	raw: string,
	base: string | undefined,
	key: string,
): React.ReactNode {
	if (!raw) return null;

	const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/;
	const linkRe = /\[([^\]]*)\]\(([^)]+)\)/;
	const boldRe = /\*\*(.+?)\*\*|__(.+?)__/s;
	const italRe = /\*([^*]+?)\*|_([^_]+?)_/s;
	const codeRe = /`([^`]+)`/;

	type Hit = {
		index: number;
		end: number;
		node: React.ReactNode;
		inner: string;
	};
	const candidates: Hit[] = [];

	const tryMatch = (
		re: RegExp,
		make: (m: RegExpMatchArray) => React.ReactNode,
	) => {
		const m = re.exec(raw);
		if (m)
			candidates.push({
				index: m.index!,
				end: m.index! + m[0].length,
				node: make(m),
				inner: "",
			});
	};

	(() => {
		const m = imgRe.exec(raw);
		if (m)
			candidates.push({
				index: m.index!,
				end: m.index! + m[0].length,
				inner: "",
				node: (
					<img
						src={resolveImgUrl(m[2], base)}
						alt={m[1]}
						className={styles.mdImg}
					/>
				),
			});
	})();

	(() => {
		const m = linkRe.exec(raw);
		if (!m) return;
		candidates.push({
			index: m.index!,
			end: m.index! + m[0].length,
			inner: "",
			node: (
				<a
					href={m[2]}
					target="_blank"
					rel="noopener noreferrer"
					className={styles.mdLink}
				>
					{renderInline(m[1], base, key + "la")}
				</a>
			),
		});
	})();

	(() => {
		const m = boldRe.exec(raw);
		if (!m) return;
		const content = m[1] ?? m[2];
		candidates.push({
			index: m.index!,
			end: m.index! + m[0].length,
			inner: "",
			node: <strong>{renderInline(content, base, key + "b")}</strong>,
		});
	})();

	(() => {
		const m = italRe.exec(raw);
		if (!m) return;
		const content = m[1] ?? m[2];
		candidates.push({
			index: m.index!,
			end: m.index! + m[0].length,
			inner: "",
			node: <em>{renderInline(content, base, key + "i")}</em>,
		});
	})();

	(() => {
		const m = codeRe.exec(raw);
		if (!m) return;
		candidates.push({
			index: m.index!,
			end: m.index! + m[0].length,
			inner: "",
			node: <code>{m[1]}</code>,
		});
	})();

	if (candidates.length === 0) return raw;

	candidates.sort(
		(a, b) => a.index - b.index || b.end - b.index - (a.end - a.index),
	);
	const hit = candidates[0];

	const before = raw.slice(0, hit.index);
	const after = raw.slice(hit.end);

	return (
		<>
			{before && <span>{before}</span>}
			{React.cloneElement(hit.node as React.ReactElement, {
				key: key + hit.index,
			})}
			{after && renderInline(after, base, key + hit.end)}
		</>
	);
}

function Inline({ text, base }: { text: string; base?: string }) {
	return <>{renderInline(text, base, "il")}</>;
}

const CALLOUT_META: Record<
	CalloutType,
	{ label: string; cls: string; icon: string }
> = {
	NOTE: { label: "Note", cls: "calloutNote", icon: "ℹ" },
	TIP: { label: "Tip", cls: "calloutTip", icon: "💡" },
	IMPORTANT: { label: "Important", cls: "calloutImportant", icon: "⚠" },
	WARNING: { label: "Warning", cls: "calloutWarning", icon: "⚠" },
	CAUTION: { label: "Caution", cls: "calloutCaution", icon: "🛑" },
};

function parseInlineHtml(html: string, baseUrl?: string): React.ReactNode {
	const unwrapped = html
		.replace(/^\s*<p[^>]*>([\s\S]*?)<\/p>\s*$/i, "$1")
		.trim();

	const rows: React.ReactNode[] = [];
	let ri = 0;
	const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
	let trM: RegExpExecArray | null;
	while ((trM = trRe.exec(unwrapped)) !== null) {
		const cells: React.ReactNode[] = [];
		const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
		let cM: RegExpExecArray | null;
		let ci = 0;
		const rowContent = trM[1];
		while ((cM = cellRe.exec(rowContent)) !== null) {
			cells.push(
				<td key={ci++} className={styles.mdTd}>
					{renderHtmlContent(cM[1], baseUrl)}
				</td>,
			);
		}
		if (cells.length) rows.push(<tr key={ri++}>{cells}</tr>);
	}
	if (rows.length) {
		return (
			<div key="htmltable" className={styles.mdTableWrap}>
				<table className={styles.mdTable}>
					<tbody>{rows}</tbody>
				</table>
			</div>
		);
	}
	return <>{renderHtmlContent(unwrapped, baseUrl)}</>;
}

function renderHtmlContent(html: string, baseUrl?: string): React.ReactNode {
	const nodes: React.ReactNode[] = [];
	const re = /<img\s[^>]*\/?>|<a\s[^>]*>[\s\S]*?<\/a>/gi;
	let last = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) {
		if (m.index > last) {
			const txt = html
				.slice(last, m.index)
				.replace(/<[^>]*>/g, "")
				.trim();
			if (txt) nodes.push(<span key={last}>{txt}</span>);
		}
		const tag = m[0];
		if (tag.toLowerCase().startsWith("<img")) {
			const srcM = tag.match(/src="([^"]*)"/i);
			const altM = tag.match(/alt="([^"]*)"/i);
			const wM = tag.match(/width="([^"]*)"/i);
			const hM = tag.match(/height="([^"]*)"/i);
			if (srcM) {
				const isBadge = /shields\.io|badge\.fury|badgen\.net/i.test(srcM[1]);
				nodes.push(
					<img
						key={m.index}
						src={resolveImgUrl(srcM[1], baseUrl)}
						alt={altM?.[1] ?? ""}
						className={isBadge ? styles.mdBadge : styles.mdHtmlImg}
						style={{
							width: wM && !isBadge ? `${wM[1]}px` : undefined,
							height: hM && !isBadge ? `${hM[1]}px` : undefined,
						}}
					/>,
				);
			}
		} else if (tag.toLowerCase().startsWith("<a")) {
			const hrefM = tag.match(/href="([^"]*)"/i);
			const inner = tag.replace(/<a[^>]*>|<\/a>/gi, "");
			const imgOnlyM = inner.trim().match(/^<img\s[^>]*\/?>$/i);
			if (imgOnlyM) {
				const srcM = inner.match(/src="([^"]*)"/i);
				const altM = inner.match(/alt="([^"]*)"/i);
				const wM = inner.match(/width="([^"]*)"/i);
				if (srcM) {
					nodes.push(
						<a
							key={m.index}
							href={hrefM?.[1] ?? "#"}
							className={styles.mdDonateLink}
							target="_blank"
							rel="noopener noreferrer"
						>
							<img
								src={resolveImgUrl(srcM[1], baseUrl)}
								alt={altM?.[1] ?? ""}
								className={styles.mdDonateImg}
								style={{
									maxWidth: wM ? `${wM[1]}px` : undefined,
								}}
							/>
						</a>,
					);
				}
			} else {
				const innerNodes = renderHtmlContent(inner, baseUrl);
				nodes.push(
					<a
						key={m.index}
						href={hrefM?.[1] ?? "#"}
						className={styles.mdLink}
						target="_blank"
						rel="noopener noreferrer"
					>
						{innerNodes}
					</a>,
				);
			}
		}
		last = m.index + m[0].length;
	}
	if (last < html.length) {
		const txt = html
			.slice(last)
			.replace(/<[^>]*>/g, "")
			.trim();
		if (txt) nodes.push(<span key={last}>{txt}</span>);
	}
	return nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}

function MarkdownRenderer({
	text,
	baseUrl,
}: {
	text: string;
	baseUrl?: string;
}) {
	const lines = text.split("\n");
	const nodes: React.ReactNode[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		if (line.startsWith("```")) {
			const lang = line.slice(3).trim();
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i].startsWith("```")) {
				codeLines.push(lines[i]);
				i++;
			}
			nodes.push(
				<pre key={`pre${i}`} className={styles.mdPre}>
					{lang && <span className={styles.mdPreLang}>{lang}</span>}
					<code>{codeLines.join("\n")}</code>
				</pre>,
			);
			i++;
			continue;
		}

		if (/^<(table|div|details|summary|p|a)\b/i.test(line.trim())) {
			const htmlLines: string[] = [];
			while (i < lines.length && lines[i].trim() !== "") {
				htmlLines.push(lines[i]);
				i++;
			}
			const htmlStr = htmlLines.join("\n");
			nodes.push(
				<div key={`html${i}`} className={styles.mdHtmlBlock}>
					{parseInlineHtml(htmlStr, baseUrl)}
				</div>,
			);
			continue;
		}

		if (line.startsWith("#### ")) {
			nodes.push(
				<h4 key={i}>
					<Inline text={line.slice(5)} base={baseUrl} />
				</h4>,
			);
		} else if (line.startsWith("### ")) {
			nodes.push(
				<h3 key={i}>
					<Inline text={line.slice(4)} base={baseUrl} />
				</h3>,
			);
		} else if (line.startsWith("## ")) {
			nodes.push(
				<h2 key={i}>
					<Inline text={line.slice(3)} base={baseUrl} />
				</h2>,
			);
		} else if (line.startsWith("# ")) {
			nodes.push(
				<h1 key={i}>
					<Inline text={line.slice(2)} base={baseUrl} />
				</h1>,
			);
		} else if (/^[-*_]{3,}$/.test(line.trim())) {
			nodes.push(<hr key={i} className={styles.mdHr} />);
		} else if (/^(\s{0,3})[-*+] /.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^(\s{0,3})[-*+] /.test(lines[i])) {
				items.push(lines[i].replace(/^(\s{0,3})[-*+] /, ""));
				i++;
			}
			nodes.push(
				<ul key={`ul${i}`}>
					{items.map((it, j) => (
						<li key={j}>
							<Inline text={it} base={baseUrl} />
						</li>
					))}
				</ul>,
			);
			continue;
		} else if (/^\d+\.\s/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
				items.push(lines[i].replace(/^\d+\.\s/, ""));
				i++;
			}
			nodes.push(
				<ol key={`ol${i}`}>
					{items.map((it, j) => (
						<li key={j}>
							<Inline text={it} base={baseUrl} />
						</li>
					))}
				</ol>,
			);
			continue;
		} else if (line.startsWith("> ")) {
			const bqLines: string[] = [];
			while (i < lines.length && lines[i].startsWith("> ")) {
				bqLines.push(lines[i].slice(2));
				i++;
			}

			const calloutMatch = bqLines[0]?.match(
				/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/i,
			);
			if (calloutMatch) {
				const type = calloutMatch[1].toUpperCase() as CalloutType;
				const meta = CALLOUT_META[type];
				const bodyLines = bqLines.slice(1).filter((l) => l.trim() !== "");
				nodes.push(
					<div
						key={`co${i}`}
						className={`${styles.mdCallout} ${styles[meta.cls]}`}
					>
						<div className={styles.mdCalloutTitle}>
							<span className={styles.mdCalloutIcon}>{meta.icon}</span>
							{meta.label}
						</div>
						{bodyLines.map((l, j) => (
							<p key={j} className={styles.mdCalloutBody}>
								<Inline text={l} base={baseUrl} />
							</p>
						))}
					</div>,
				);
			} else {
				nodes.push(
					<blockquote key={`bq${i}`} className={styles.mdBlockquote}>
						{bqLines.map((l, j) => (
							<p key={j}>
								<Inline text={l} base={baseUrl} />
							</p>
						))}
					</blockquote>,
				);
			}
			continue;
		} else if (/^\|.+\|/.test(line)) {
			const tableLines: string[] = [];
			while (i < lines.length && /^\|/.test(lines[i])) {
				tableLines.push(lines[i]);
				i++;
			}
			const parseRow = (r: string) =>
				r
					.split("|")
					.slice(1, -1)
					.map((c) => c.trim());
			const headers = parseRow(tableLines[0]);
			const body = tableLines
				.slice(2)
				.filter((r) => !/^\|[-: |]+\|$/.test(r.trim()))
				.map(parseRow);
			nodes.push(
				<div key={`tbl${i}`} className={styles.mdTableWrap}>
					<table className={styles.mdTable}>
						<thead>
							<tr>
								{headers.map((h, j) => (
									<th key={j} className={styles.mdTh}>
										<Inline text={h} base={baseUrl} />
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{body.map((row, ri) => (
								<tr key={ri}>
									{row.map((cell, ci) => (
										<td key={ci} className={styles.mdTd}>
											<Inline text={cell} base={baseUrl} />
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>,
			);
			continue;
		} else if (/^(?:!\[[^\]]*\]\([^)]*\)\s*)+$/.test(line.trim())) {
			const imgMatches = [...line.trim().matchAll(/!\[([^\]]*)\]\(([^)]*)\)/g)];
			const isBadge = (url: string) =>
				/shields\.io|badge\.fury|badgen\.net|img\.shields/i.test(url);
			const hasBadges = imgMatches.some((m) => isBadge(m[2]));
			const hasReal = imgMatches.some((m) => !isBadge(m[2]));
			if (hasBadges && !hasReal) {
				nodes.push(
					<div key={i} className={styles.mdBadgeRow}>
						{imgMatches.map((m, idx) => (
							<img
								key={idx}
								src={resolveImgUrl(m[2], baseUrl)}
								alt={m[1]}
								className={styles.mdBadge}
							/>
						))}
					</div>,
				);
			} else {
				imgMatches.forEach((m, idx) => {
					nodes.push(
						<div key={`${i}_${idx}`} className={styles.mdImgWrap}>
							<img
								src={resolveImgUrl(m[2], baseUrl)}
								alt={m[1]}
								className={styles.mdImgBlock}
							/>
						</div>,
					);
				});
			}
		} else if (line.trim() !== "") {
			nodes.push(
				<p key={i}>
					<Inline text={line} base={baseUrl} />
				</p>,
			);
		}
		i++;
	}

	return <div className={styles.markdownBody}>{nodes}</div>;
}

function LogoPlaceholder({ isTheme }: { isTheme: boolean }) {
	return (
		<div className={`${styles.logoPh} ${isTheme ? styles.logoPhTheme : ""}`}>
			{isTheme ? <IconPalette /> : <IconBlocks />}
		</div>
	);
}

function TagBadge({
	tag,
	active,
	onClick,
}: {
	tag: Tag;
	active?: boolean;
	onClick?: () => void;
}) {
	const cls = [
		styles.tagBadge,
		styles[TAG_CLASS[tag]],
		active ? styles.tagBadgeActive : "",
		onClick ? styles.tagBadgeClickable : "",
	]
		.filter(Boolean)
		.join(" ");
	return (
		<span className={cls} onClick={onClick}>
			{tag}
		</span>
	);
}

function ClientChip(_: { client: string }) {
	return null;
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
						<IconX />
					</button>
				</div>
				<div className={styles.modalBoxBody}>
					<div className={styles.downloadOptions}>
						{ext.releaseAssets.map((asset) => {
							const icon = asset.name.toLowerCase().endsWith(".js") ? (
								<IconCode />
							) : asset.name.toLowerCase().endsWith(".tar.gz") ||
							  asset.name.toLowerCase().endsWith(".zip") ? (
								<IconDownload />
							) : (
								<IconFile />
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
									<IconDownload />
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

function ExtensionPage({
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
		setReadme(null);
		setReadmeLoading(true);
		fetch(ext.readmeUrl)
			.then((r) => r.text())
			.then(setReadme)
			.catch(() => setReadme("*Failed to load README.*"))
			.finally(() => setReadmeLoading(false));
	}, [ext.readmeUrl]);

	useEffect(() => {
		if (!showUserJs || userJsContent !== null || !ext.userJsUrl) return;
		fetch(ext.userJsUrl)
			.then((r) => r.text())
			.then(setUserJsContent)
			.catch(() => setUserJsContent("// Failed to load user.js"));
	}, [showUserJs, ext.userJsUrl]);

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
					<IconArrowLeft /> Back to Store
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
						<div className={styles.extPageClients}>
							{ext.clients.map((c) => (
								<ClientChip key={c} client={c} />
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
							<IconExternalLink /> Repository
						</a>
					)}
					{hasDownload && (
						<button
							className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
							onClick={() => setShowDl(true)}
						>
							<IconDownload /> Download
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

function ExtCard({
	ext,
	onClick,
	onDownload,
	style,
}: {
	ext: Extension;
	onClick: () => void;
	onDownload: (e: React.MouseEvent) => void;
	style?: React.CSSProperties;
}) {
	return (
		<div className={styles.card} onClick={onClick} style={style}>
			<div className={styles.cardTop}>
				{ext.logo ? (
					<img src={ext.logo} alt={ext.name} className={styles.cardLogo} />
				) : (
					<LogoPlaceholder isTheme={ext.isTheme} />
				)}
				<div className={styles.cardMeta}>
					<div className={styles.cardName}>{ext.name}</div>
					{ext.author && (
						<span className={styles.cardSub}>by {ext.author}</span>
					)}
					<div className={styles.cardClients}>
						{ext.clients.map((c) => (
							<ClientChip key={c} client={c} />
						))}
					</div>
				</div>
			</div>

			<div className={styles.cardTags}>
				{ext.tags.map((t) => (
					<TagBadge key={t} tag={t} />
				))}
			</div>

			<div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
				<div className={styles.cardActionsRight}>
					<button
						className={`${styles.btn} ${styles.btnPrimary}`}
						onClick={onDownload}
						disabled={ext.releaseAssets.length === 0 && !ext.downloadZip}
					>
						<IconDownload /> Download
					</button>
				</div>
			</div>
		</div>
	);
}

export default function NextMusicStore() {
	const { githubToken, loading: authLoading } = useAuth();
	const { extensions, loading, loadingMsg, error, fetchExtensions } =
		useExtensions(githubToken, authLoading);
	const { selectedExt, setSelectedExt, hashNotFound, setHashNotFound } =
		useStoreNavigation(extensions);

	const [activeTab, setActiveTab] = useState<"addons" | "themes">("addons");
	const [activeTags, setActiveTags] = useState<Tag[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [downloadTarget, setDownloadTarget] = useState<Extension | null>(null);

	const toggleTag = useCallback(
		(tag: Tag) =>
			setActiveTags((p) =>
				p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag],
			),
		[],
	);

	const filteredAddons = extensions.filter(
		(e) => !e.isTheme && matchSearch(e, searchQuery, activeTags),
	);
	const filteredThemes = extensions.filter(
		(e) => e.isTheme && matchSearch(e, searchQuery, activeTags),
	);
	const shownItems = activeTab === "addons" ? filteredAddons : filteredThemes;

	return (
		<div className={styles.root}>
			{hashNotFound ? (
				<div className={styles.notFound}>
					<div className={styles.notFoundCode}>404</div>
					<div className={styles.notFoundTitle}>Extension not found</div>
					<div className={styles.notFoundSub}>
						No extension matched <code>#{hashNotFound}</code>
					</div>
					<button
						className={`${styles.btn} ${styles.btnPrimary}`}
						onClick={() => {
							setHashNotFound(null);
							window.history.replaceState(null, "", "/store");
						}}
					>
						Back to Store
					</button>
				</div>
			) : selectedExt ? (
				<ExtensionPage ext={selectedExt} onBack={() => setSelectedExt(null)} />
			) : (
				<>
					<div className={styles.tabs}>
						<div className={styles.tabsInner}>
							<button
								className={`${styles.tab} ${activeTab === "addons" ? styles.tabActive : ""}`}
								onClick={() => setActiveTab("addons")}
							>
								<IconBlocks /> Addons
								<span className={styles.tabCount}>{filteredAddons.length}</span>
							</button>
							<button
								className={`${styles.tab} ${activeTab === "themes" ? styles.tabActive : ""}`}
								onClick={() => setActiveTab("themes")}
							>
								<IconPalette /> Themes
								<span className={styles.tabCount}>{filteredThemes.length}</span>
							</button>
						</div>
					</div>

					<div className={styles.toolbar}>
						<div className={styles.toolbarInner}>
							<div className={styles.searchWrap}>
								<span className={styles.searchIcon}>
									<IconSearch />
								</span>
								<input
									className={styles.searchInput}
									type="text"
									placeholder="Search extensions…"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
							</div>
							<div className={styles.tagFilters}>
								<span className={styles.tagFilterLabel}>Filter:</span>
								{ALL_TAGS.map((tag) => (
									<TagBadge
										key={tag}
										tag={tag}
										active={activeTags.includes(tag)}
										onClick={() => toggleTag(tag)}
									/>
								))}
								{activeTags.length > 0 && (
									<button
										className={`${styles.btn} ${styles.btnGhost}`}
										style={{
											padding: "3px 10px",
											fontSize: "0.62rem",
										}}
										onClick={() => setActiveTags([])}
									>
										Clear
									</button>
								)}
							</div>
						</div>
					</div>

					<main className={styles.main}>
						<div className={styles.secLabel}>
							{activeTab === "addons" ? "Addons" : "Themes"}
						</div>

						{loading ? (
							<>
								<div className={styles.loadingMsg}>
									<span className={styles.spinner} />
									{loadingMsg}
								</div>
								<div className={styles.loadingGrid}>
									{Array.from({ length: 6 }).map((_, idx) => (
										<div
											key={idx}
											className={styles.skeletonCard}
											style={{
												animationDelay: `${idx * 100}ms`,
											}}
										/>
									))}
								</div>
							</>
						) : error ? (
							<div className={styles.grid}>
								<div className={styles.errorBox}>
									<div>
										Failed to load extensions: {error}
										<br />
										<button
											className={styles.retryBtn}
											onClick={() => fetchExtensions(githubToken ?? undefined)}
										>
											Retry
										</button>
									</div>
								</div>
							</div>
						) : (
							<div className={styles.grid}>
								{shownItems.length === 0 ? (
									<div className={styles.empty}>No extensions found</div>
								) : (
									shownItems.map((ext, idx) => (
										<ExtCard
											key={ext.id}
											ext={ext}
											style={{
												animationDelay: `${idx * 40}ms`,
											}}
											onClick={() => {
												const slug = ext.name
													.toLowerCase()
													.replace(/\s+/g, "-");
												window.location.href = `/addon?name=${slug}`;
											}}
											onDownload={(e) => {
												e.stopPropagation();
												setDownloadTarget(ext);
											}}
										/>
									))
								)}
							</div>
						)}
					</main>
				</>
			)}

			{downloadTarget && (
				<DownloadModal
					ext={downloadTarget}
					onClose={() => setDownloadTarget(null)}
				/>
			)}
		</div>
	);
}
