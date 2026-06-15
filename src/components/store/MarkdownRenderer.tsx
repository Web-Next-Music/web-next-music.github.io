"use client";
import React from "react";
import type { CalloutType } from "@/types/addon";
import styles from "./StoreFeed.module.scss";

export function resolveImgUrl(src: string, baseUrl?: string): string {
	if (!src || /^https?:\/\//i.test(src)) return src;
	return baseUrl ? baseUrl.replace(/\/?$/, "/") + src.replace(/^\//, "") : src;
}

export function renderInline(
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

export function MarkdownRenderer({
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
