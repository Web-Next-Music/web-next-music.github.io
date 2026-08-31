"use client";
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Blocks, Palette, Download } from "lucide-react";
import { useAuth } from "@/lib/auth";
import Modal from "@/components/ui/Modal";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Tabs from "@/components/ui/Tabs";
import styles from "./StoreFeed.module.scss";
import { Extension, Tag } from "@/lib/addons/addonCache";
import { useExtensions } from "@/lib/store/useExtensions";
import { useStoreNavigation } from "@/lib/store/useStoreNavigation";
import { ExtensionPage } from "./ExtensionPage";

const ALL_TAGS: Tag[] = ["Next Music", "PulseSync", "Web"];

const TAG_CLASS: Record<Tag, string> = {
	"Next Music": "tagNm",
	PulseSync: "tagPs",
	Web: "tagWeb",
};

function matchSearch(ext: Extension, query: string, activeTag: Tag | "") {
	const q = query.toLowerCase();
	return (
		(!q || ext.name.toLowerCase().includes(q)) &&
		(!activeTag || ext.tags.includes(activeTag))
	);
}

function LogoPlaceholder({ isTheme }: { isTheme: boolean }) {
	return (
		<div className={`${styles.logoPh} ${isTheme ? styles.logoPhTheme : ""}`}>
			{isTheme ? <Palette size={14} /> : <Blocks size={14} />}
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

function DownloadModal({
	ext,
	onClose,
}: {
	ext: Extension;
	onClose: () => void;
}) {
	return (
		<Modal
			open
			onClose={onClose}
			size="sm"
			title={`Download - ${ext.name}`}
			bodyClassName={styles.modalBoxBody}
		>
			<div className={styles.downloadOptions}>
				{ext.releaseAssets.map((asset) => (
					<a
						key={asset.name}
						href={asset.url}
						className={styles.dlOption}
						target="_blank"
						rel="noopener noreferrer"
					>
						<div className={styles.dlOptionInfo}>
							<div className={styles.dlOptionLabel}>{asset.name}</div>
						</div>
						<span className={styles.dlOptionBadge}>{asset.ext}</span>
					</a>
				))}
				{ext.downloadZip && (
					<a
						href={ext.downloadZip}
						className={styles.dlOption}
						target="_blank"
						rel="noopener noreferrer"
					>
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
		</Modal>
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
						<Download size={17} /> Download
					</button>
				</div>
			</div>
		</div>
	);
}

export default function NextMusicStore() {
	const router = useRouter();
	const { githubToken, loading: authLoading } = useAuth();
	const { extensions, loading, loadingMsg, error, fetchExtensions } =
		useExtensions(githubToken, authLoading);
	const { selectedExt, setSelectedExt, hashNotFound, setHashNotFound } =
		useStoreNavigation(extensions);

	const [activeTab, setActiveTab] = useState<"addons" | "themes">("addons");
	const [activeTag, setActiveTag] = useState<Tag | "">("");
	const [searchQuery, setSearchQuery] = useState("");
	const [downloadTarget, setDownloadTarget] = useState<Extension | null>(null);

	const filteredAddons = useMemo(
		() =>
			extensions.filter(
				(e) => !e.isTheme && matchSearch(e, searchQuery, activeTag),
			),
		[extensions, searchQuery, activeTag],
	);
	const filteredThemes = useMemo(
		() =>
			extensions.filter(
				(e) => e.isTheme && matchSearch(e, searchQuery, activeTag),
			),
		[extensions, searchQuery, activeTag],
	);
	const shownItems = useMemo(
		() => (activeTab === "addons" ? filteredAddons : filteredThemes),
		[activeTab, filteredAddons, filteredThemes],
	);

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
						<Tabs
							className={styles.tabsInner}
							variant="folder"
							value={activeTab}
							onChange={setActiveTab}
							aria-label="Extension type"
							items={[
								{
									value: "addons" as const,
									label: "Addons",
									icon: <Blocks size={14} />,
									count: filteredAddons.length,
								},
								{
									value: "themes" as const,
									label: "Themes",
									icon: <Palette size={14} />,
									count: filteredThemes.length,
								},
							]}
						/>
					</div>

					<div className={styles.toolbar}>
						<div className={styles.toolbarInner}>
							<SearchInput
								radius="pill"
								size="sm"
								placeholder="Search extensions…"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								onClear={() => setSearchQuery("")}
								wrapperClassName={styles.searchWrap}
							/>
							<div className={styles.filterWrap}>
								<Select
									value={activeTag}
									onChange={setActiveTag}
									options={[
										{ value: "", label: "All" },
										...ALL_TAGS.map((t) => ({ value: t, label: t })),
									]}
								/>
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
										<Skeleton
											key={idx}
											variant="block"
											radius="lg"
											className={styles.skeletonCard}
											style={{ animationDelay: `${idx * 100}ms` }}
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
											style={{ animationDelay: `${idx * 40}ms` }}
											onClick={() => {
												const slug = ext.name
													.toLowerCase()
													.replace(/\s+/g, "-");
												router.push(`/addon?name=${slug}`);
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
