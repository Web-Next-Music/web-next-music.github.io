"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Select from "@/components/ui/Select";
import Callout from "@/components/ui/Callout";
import Button from "@/components/ui/Button";
import SignInCard from "@/components/ui/SignInCard";
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

	const {
		user,
		loading: authLoading,
		githubToken,
		signInWithGitHub,
	} = useAuth();

	const [settings, setSettings] = useState<LaSettingsView | null>(null);
	const [publicInfo, setPublicInfo] = useState<LaPublicInfo | null>(null);
	const [scheme, setScheme] = useState<LaScheme | null>(null);
	const [loadingSettings, setLoadingSettings] = useState(false);
	const [notAvailable, setNotAvailable] = useState(false);
	const [confirmed, setConfirmed] = useState(false);
	const [signingIn, setSigningIn] = useState(false);
	const [signInError, setSignInError] = useState<string | null>(null);

	const handleSignIn = useCallback(async () => {
		setSigningIn(true);
		setSignInError(null);
		const err = await signInWithGitHub();
		if (err) {
			setSignInError(err);
			setSigningIn(false);
		}
	}, [signInWithGitHub]);

	useEffect(() => {
		setConfirmed(false);
	}, [server, port]);
	const [tags, setTags] = useState<string[]>([]);
	const [draft, setDraft] = useState<LaSettingsPatch>({});
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<number | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);

	useEffect(() => {
		fetchClientTags(githubToken ?? undefined).then(setTags);
	}, [githubToken]);

	useEffect(() => {
		if (!server) return;
		fetchLaPublicInfo(server, port || undefined).then((result) => {
			if (!result) return;
			setPublicInfo(result.data);
			setScheme(result.scheme);
		});
	}, [server, port]);

	const load = useCallback(async () => {
		if (!server || !confirmed) return;
		if (!githubToken) {
			setNotAvailable(false);
			setLoadingSettings(false);
			return;
		}
		setLoadingSettings(true);
		setNotAvailable(false);

		let activeScheme = scheme;
		if (!activeScheme) {
			const info = await fetchLaPublicInfo(server, port || undefined);
			if (info) {
				setPublicInfo(info.data);
				activeScheme = info.scheme;
				setScheme(info.scheme);
			}
		}

		if (!activeScheme) {
			setNotAvailable(true);
			setLoadingSettings(false);
			return;
		}

		const result = await fetchLaSettings(
			server,
			port || undefined,
			githubToken,
			activeScheme,
		);
		if (!result) {
			setNotAvailable(true);
		} else {
			setSettings(result.data);
			setDraft(result.data);
			setScheme(result.scheme);
		}
		setLoadingSettings(false);
	}, [server, port, githubToken, scheme, confirmed]);

	useEffect(() => {
		load();
	}, [load]);

	const missingParams = !server;

	const save = async () => {
		if (!server || !githubToken) return;
		setSaving(true);
		setSaveError(null);
		const result = await updateLaSettings(
			server,
			port || undefined,
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
	const signedOut = !missingParams && !authLoading && !user;

	return (
		<>
			<Header />
			<div className={styles.page}>
				{!signedOut && (
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
				)}

				{missingParams && (
					<div className={styles.notice}>
						Open this page with <code>?server=host</code> (optionally{" "}
						<code>&amp;port=port</code>) to manage a server
					</div>
				)}

				{signedOut && (
					<SignInCard
						loading={signingIn}
						error={signInError}
						onSignIn={handleSignIn}
					/>
				)}

				{!missingParams && !signedOut && (
					<div className={styles.card}>
						{authLoading && <div className={storeStyles.skeletonCard} />}

						{!authLoading && user && !confirmed && (
							<div className={styles.confirmBlock}>
								<Callout
									tone="warning"
									title="Confirm connection"
									icon={
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
											<path
												d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									}
								>
									Continuing will send your GitHub credentials to{" "}
									<strong>{address}</strong> to check admin access. Only
									continue if you trust this server
								</Callout>
								<div className={styles.confirmActions}>
									<Button onClick={() => setConfirmed(true)}>Continue</Button>
								</div>
							</div>
						)}

						{!authLoading && user && confirmed && !githubToken && (
							<div className={styles.confirmBlock}>
								<Callout
									tone="warning"
									title="GitHub session expired"
									icon={
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
											<path
												d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									}
								>
									Your GitHub session needs to be refreshed before we can check
									admin access on <strong>{address}</strong>
								</Callout>
								<div className={styles.confirmActions}>
									<Button disabled={signingIn} onClick={handleSignIn}>
										{signingIn ? "Connecting…" : "Reconnect GitHub"}
									</Button>
								</div>
							</div>
						)}

						{!authLoading && user && confirmed && loadingSettings && (
							<div className={storeStyles.skeletonCard} />
						)}

						{!authLoading &&
							user &&
							confirmed &&
							!loadingSettings &&
							notAvailable && (
								<ServerLoadError
									server={server}
									port={port}
									scheme={scheme ?? "https"}
									onRetry={load}
								/>
							)}

						{confirmed && settings && !loadingSettings && (
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
										<span className={styles.label}>Allow dev clients</span>
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
									<Button
										className={styles.saveBtn}
										disabled={saving}
										onClick={save}
									>
										{saving ? "Saving…" : "Save"}
									</Button>
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
