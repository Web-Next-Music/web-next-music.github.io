"use client";

import Image from "next/image";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Select from "@/components/ui/Select";
import Callout from "@/components/ui/Callout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Switch from "@/components/ui/Switch";
import Textarea from "@/components/ui/Textarea";
import SignInCard from "@/components/common/SignInCard";
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
			<div className={"max-w-160 m-[0_auto] p-5"}>
				{!signedOut && (
					<div className={"flex justify-center items-center gap-4 mb-7"}>
						{(settings?.serverCoverUrl || publicInfo?.cover) && (
							<Image
								src={settings?.serverCoverUrl || publicInfo?.cover || ""}
								alt=""
								width={70}
								height={70}
								className={
									"shrink-0 w-17.5 h-17.5 rounded-md object-cover [border:1px_solid_var(--border)] [background:var(--surface)]"
								}
							/>
						)}
						<div className={"flex-1 min-w-0"}>
							<h1
								className={
									"font-extrabold text-[1.7rem] tracking-[-0.02em] leading-[1.15] m-[0_0_6px] [word-break:break-word]"
								}
							>
								{settings?.name ||
									publicInfo?.name ||
									(missingParams ? "Server settings" : address)}
							</h1>
							{!missingParams && (settings?.name || publicInfo?.name) && (
								<span
									className={
										"inline-flex items-center font-sans text-[0.82rem] text-muted tracking-[0.01em]"
									}
								>
									{address}
								</span>
							)}
						</div>
						{publicInfo?.version && (
							<span
								className={
									"shrink-0 inline-flex items-center gap-1.5 font-sans text-[0.72rem] font-bold text-muted [background:var(--surface)] [border:1px_solid_var(--border)] rounded-(--radius-pill) p-[6px_13px] whitespace-nowrap mt-1.5"
								}
							>
								{publicInfo.version.startsWith("v")
									? publicInfo.version
									: `v${publicInfo.version}`}
							</span>
						)}
					</div>
				)}

				{missingParams && (
					<div
						className={
							"font-sans text-[0.78rem] text-muted [background:var(--surface2,var(--surface))] [border:1px_solid_var(--border)] rounded-lg p-[16px_18px]"
						}
					>
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
					<div
						className={
							"flex flex-col [background:var(--surface)] [border:1px_solid_var(--border)] rounded-2xl p-(--space-5) gap-(--space-5)"
						}
					>
						{authLoading && (
							<div
								className={
									"[background:var(--surface)] [border:1px_solid_var(--border)] h-45"
								}
							/>
						)}

						{!authLoading && user && !confirmed && (
							<div className={"flex flex-col gap-4.5"}>
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
								<div
									className={
										"flex items-center gap-2.5 pt-4.5 [border-top:1px_solid_var(--border)]"
									}
								>
									<Button onClick={() => setConfirmed(true)}>Continue</Button>
								</div>
							</div>
						)}

						{!authLoading && user && confirmed && !githubToken && (
							<div className={"flex flex-col gap-4.5"}>
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
								<div
									className={
										"flex items-center gap-2.5 pt-4.5 [border-top:1px_solid_var(--border)]"
									}
								>
									<Button disabled={signingIn} onClick={handleSignIn}>
										{signingIn ? "Connecting…" : "Reconnect GitHub"}
									</Button>
								</div>
							</div>
						)}

						{!authLoading && user && confirmed && loadingSettings && (
							<div
								className={
									"[background:var(--surface)] [border:1px_solid_var(--border)] h-45"
								}
							/>
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
								<div
									className={
										"[background:var(--surface2,var(--surface))] [border:1px_solid_var(--border)] rounded-lg p-(--space-5)"
									}
								>
									<div
										className={
											"font-sans text-[1.05rem] font-extrabold text-(--text,inherit) tracking-[-0.01em] mb-4.5"
										}
									>
										General
									</div>

									<div
										className={
											"flex flex-col gap-1.5 mb-4.5 pb-4.5 [border-bottom:1px_solid_var(--border)] last:mb-0 last:pb-0 last:[border-bottom:none]"
										}
									>
										<span
											className={
												"font-sans text-[0.72rem] font-bold text-muted uppercase tracking-[0.03em]"
											}
										>
											Cover URL
										</span>
										<Input
											className={
												"[background:var(--surface2,var(--surface))] h-(--control-h-lg) text-[0.84rem]"
											}
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

									<div
										className={
											"flex flex-col gap-1.5 mb-4.5 pb-4.5 [border-bottom:1px_solid_var(--border)] last:mb-0 last:pb-0 last:[border-bottom:none]"
										}
									>
										<span
											className={
												"font-sans text-[0.72rem] font-bold text-muted uppercase tracking-[0.03em]"
											}
										>
											Name
										</span>
										<Input
											className={
												"[background:var(--surface2,var(--surface))] h-(--control-h-lg) text-[0.84rem]"
											}
											value={draft.name ?? ""}
											onChange={(e) =>
												setDraft((d) => ({
													...d,
													name: e.target.value,
												}))
											}
										/>
									</div>

									<div
										className={
											"flex flex-col gap-1.5 mb-4.5 pb-4.5 [border-bottom:1px_solid_var(--border)] last:mb-0 last:pb-0 last:[border-bottom:none]"
										}
									>
										<span
											className={
												"font-sans text-[0.72rem] font-bold text-muted uppercase tracking-[0.03em]"
											}
										>
											Description
										</span>
										<Textarea
											className={
												"[background:var(--surface2,var(--surface))] min-h-19 text-[0.84rem] leading-normal"
											}
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

								<div
									className={
										"[background:var(--surface2,var(--surface))] [border:1px_solid_var(--border)] rounded-lg p-(--space-5)"
									}
								>
									<div
										className={
											"font-sans text-[1.05rem] font-extrabold text-(--text,inherit) tracking-[-0.01em] mb-4.5"
										}
									>
										Connection
									</div>

									<div
										className={
											"flex flex-col gap-1.5 mb-4.5 pb-4.5 [border-bottom:1px_solid_var(--border)] last:mb-0 last:pb-0 last:[border-bottom:none]"
										}
									>
										<span
											className={
												"font-sans text-[0.72rem] font-bold text-muted uppercase tracking-[0.03em]"
											}
										>
											Supported client versions
										</span>
										<div className={"flex gap-3 *:flex-1"}>
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

									<div className={"flex items-center justify-between mt-4.5"}>
										<span
											className={
												"font-sans text-[0.72rem] font-bold text-muted uppercase tracking-[0.03em]"
											}
										>
											Allow dev clients
										</span>
										<Switch
											checked={draft.devMode ?? false}
											onCheckedChange={(devMode) =>
												setDraft((d) => ({ ...d, devMode }))
											}
										/>
									</div>
								</div>

								<div
									className={
										"flex items-center gap-3.5 pt-5.5 [border-top:1px_solid_var(--border)]"
									}
								>
									<Button
										className={"min-w-45"}
										disabled={saving}
										onClick={save}
									>
										{saving ? "Saving…" : "Save"}
									</Button>
									{saveError && (
										<span className={"font-sans text-[0.75rem] text-muted"}>
											{saveError}
										</span>
									)}
									{!saveError && savedAt && (
										<span className={"[composes:status] text-accent font-bold"}>
											Saved
										</span>
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
