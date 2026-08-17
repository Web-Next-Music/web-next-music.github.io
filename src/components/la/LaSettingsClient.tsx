"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Select from "@/components/ui/Select";
import { useAuth } from "@/lib/auth";
import {
	fetchLaSettings,
	updateLaSettings,
	fetchLaPublicInfo,
	type LaSettingsView,
	type LaSettingsPatch,
	type LaPublicInfo,
	type LaScheme,
} from "@/lib/la/laAdmin";
import { fetchClientTags } from "@/lib/la/laClientTags";
import ServerLoadError from "@/components/la/ServerLoadError";
import storeStyles from "@/components/store/StoreFeed.module.scss";
import styles from "./LaSettingsClient.module.scss";

export default function LaSettingsClient() {
	const searchParams = useSearchParams();
	const server = searchParams.get("server") ?? "";
	const port = searchParams.get("port") ?? "";

	const { user, loading: authLoading, githubToken, openAuthModal } = useAuth();

	const [settings, setSettings] = useState<LaSettingsView | null>(null);
	const [publicInfo, setPublicInfo] = useState<LaPublicInfo | null>(null);
	const [scheme, setScheme] = useState<LaScheme | null>(null);
	const [loadingSettings, setLoadingSettings] = useState(false);
	const [notAvailable, setNotAvailable] = useState(false);
	const [tags, setTags] = useState<string[]>([]);
	const [draft, setDraft] = useState<LaSettingsPatch>({});
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<number | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);

	useEffect(() => {
		fetchClientTags(githubToken ?? undefined).then(setTags);
	}, [githubToken]);

	useEffect(() => {
		if (!server || !port) return;
		fetchLaPublicInfo(server, port).then((result) => {
			if (!result) return;
			setPublicInfo(result.data);
			setScheme(result.scheme);
		});
	}, [server, port]);

	const load = useCallback(() => {
		if (!server || !port || !githubToken) return;
		setLoadingSettings(true);
		setNotAvailable(false);
		fetchLaSettings(server, port, githubToken, scheme ?? undefined)
			.then((result) => {
				if (!result) {
					setNotAvailable(true);
					return;
				}
				setSettings(result.data);
				setDraft(result.data);
				setScheme(result.scheme);
			})
			.finally(() => setLoadingSettings(false));
	}, [server, port, githubToken, scheme]);

	useEffect(() => {
		load();
	}, [load]);

	const missingParams = !server || !port;

	const save = async () => {
		if (!server || !port || !githubToken) return;
		setSaving(true);
		setSaveError(null);
		const result = await updateLaSettings(
			server,
			port,
			githubToken,
			draft,
			scheme ?? undefined,
		);
		setSaving(false);
		if (!result) {
			setSaveError("Couldn't save settings for this server");
			return;
		}
		setSettings(result.data);
		setDraft(result.data);
		setScheme(result.scheme);
		setSavedAt(Date.now());
	};

	const tagOptions = [
		{ value: "", label: "No minimum" },
		...tags.map((t) => ({ value: t, label: t })),
	];
	const maxTagOptions = [
		{ value: "", label: "No maximum" },
		...tags.map((t) => ({ value: t, label: t })),
	];

	const address = port ? `${server}:${port}` : server;

	return (
		<>
			<Header />
			<div className={styles.page}>
				<div className={styles.hero}>
					{(settings?.serverCoverUrl || publicInfo?.cover) && (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={settings?.serverCoverUrl || publicInfo?.cover}
							alt=""
							className={styles.avatar}
						/>
					)}
					<div className={styles.heroMain}>
						<h1 className={styles.title}>
							{settings?.name ||
								publicInfo?.name ||
								(missingParams ? "Server settings" : address)}
						</h1>
						{!missingParams && (settings?.name || publicInfo?.name) && (
							<span className={styles.address}>{address}</span>
						)}
					</div>
					{publicInfo?.version && (
						<span className={styles.versionBadge}>
							{publicInfo.version.startsWith("v")
								? publicInfo.version
								: `v${publicInfo.version}`}
						</span>
					)}
				</div>

				{missingParams && (
					<div className={styles.notice}>
						Open this page with <code>?server=host&amp;port=port</code> to
						manage a server
					</div>
				)}

				{!missingParams && (
					<div className={styles.card}>
						{authLoading && <div className={storeStyles.skeletonCard} />}

						{!authLoading && !user && (
							<div className={styles.signInBox}>
								<button
									type="button"
									className={styles.signInBtn}
									onClick={openAuthModal}
								>
									Sign in with GitHub
								</button>
							</div>
						)}

						{!authLoading && user && loadingSettings && (
							<div className={storeStyles.skeletonCard} />
						)}

						{!authLoading && user && !loadingSettings && notAvailable && (
							<ServerLoadError
								server={server}
								port={port}
								scheme={scheme ?? "https"}
								onRetry={load}
							/>
						)}

						{settings && !loadingSettings && (
							<>
								<div className={styles.section}>
									<div className={styles.sectionTitle}>General</div>

									<div className={styles.field}>
										<span className={styles.label}>Cover URL</span>
										<input
											className={styles.input}
											placeholder="https://example.com/cover.png"
											value={draft.serverCoverUrl ?? ""}
											onChange={(e) =>
												setDraft((d) => ({
													...d,
													serverCoverUrl: e.target.value,
												}))
											}
										/>
									</div>

									<div className={styles.field}>
										<span className={styles.label}>Name</span>
										<input
											className={styles.input}
											value={draft.name ?? ""}
											onChange={(e) =>
												setDraft((d) => ({
													...d,
													name: e.target.value,
												}))
											}
										/>
									</div>

									<div className={styles.field}>
										<span className={styles.label}>Description</span>
										<textarea
											className={styles.textarea}
											value={draft.description ?? ""}
											onChange={(e) =>
												setDraft((d) => ({
													...d,
													description: e.target.value,
												}))
											}
										/>
									</div>
								</div>

								<div className={styles.section}>
									<div className={styles.sectionTitle}>Connection</div>

									<div className={styles.field}>
										<span className={styles.label}>
											Supported client versions
										</span>
										<div className={styles.row}>
											<Select
												value={draft.minClientVersion ?? ""}
												onChange={(v) =>
													setDraft((d) => ({
														...d,
														minClientVersion: v,
													}))
												}
												options={tagOptions}
												label="Min"
											/>
											<Select
												value={draft.maxClientVersion ?? ""}
												onChange={(v) =>
													setDraft((d) => ({
														...d,
														maxClientVersion: v,
													}))
												}
												options={maxTagOptions}
												label="Max"
											/>
										</div>
									</div>

									<div className={styles.toggleRow}>
										<span className={styles.label}>
											Allow dev clients
										</span>
										<label className={styles.switch}>
											<input
												type="checkbox"
												checked={draft.devMode ?? false}
												onChange={(e) =>
													setDraft((d) => ({
														...d,
														devMode: e.target.checked,
													}))
												}
											/>
											<span className={styles.switchTrack} />
										</label>
									</div>
								</div>

								<div className={styles.saveBar}>
									<button
										type="button"
										className={styles.saveBtn}
										disabled={saving}
										onClick={save}
									>
										{saving ? "Saving…" : "Save"}
									</button>
									{saveError && (
										<span className={styles.status}>{saveError}</span>
									)}
									{!saveError && savedAt && (
										<span className={styles.statusOk}>Saved</span>
									)}
								</div>
							</>
						)}
					</div>
				)}
			</div>
			<Footer />
		</>
	);
}
