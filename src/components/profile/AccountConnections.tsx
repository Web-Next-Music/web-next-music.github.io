"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ShieldCheck, Link } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
	AUTH_SERVICES,
	cancelAccountTransfer,
	confirmAccountTransfer,
	getLinkedAccounts,
	getPendingAccountTransfer,
	startAccountLink,
	startAccountTransfer,
	unlinkAccount,
	type AccountProvider,
} from "@/lib/auth/accountLinks";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import ServiceIcon from "./ServiceIcon";
import styles from "./AccountConnections.module.scss";

type PendingTransfer = NonNullable<
	Awaited<ReturnType<typeof getPendingAccountTransfer>>
>;
type TransferDialog =
	| { kind: "verify"; provider: AccountProvider }
	| { kind: "confirm"; pending: PendingTransfer }
	| { kind: "previewError" };

function isProvider(value: string | null): value is AccountProvider {
	return AUTH_SERVICES.some((service) => service.provider === value);
}

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error && error.message ? error.message : fallback;
}

export default function AccountConnections({
	disabled = false,
}: {
	disabled?: boolean;
}) {
	const { user, refreshUser, isBanned, banChecking } = useAuth();
	const [dialog, setDialog] = useState<TransferDialog | null>(null);
	const [busy, setBusy] = useState<string | null>(null);
	const operation = useRef(false);
	const [previewLoading, setPreviewLoading] = useState(true);
	const [previewRetry, setPreviewRetry] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const [needsRefresh, setNeedsRefresh] = useState(false);
	const [acknowledged, setAcknowledged] = useState(false);
	useEffect(() => {
		setAcknowledged(false);
	}, [dialog]);
	const blocked = disabled || isBanned || banChecking;
	const userId = user?.id;

	useEffect(() => {
		if (!userId) return;
		const url = new URL(window.location.href);
		const hash = new URLSearchParams(url.hash.slice(1));
		const callbackProvider = url.searchParams.get("link_provider");
		const callbackError = url.searchParams.get("error") || hash.get("error");
		const description =
			url.searchParams.get("error_description") ||
			hash.get("error_description");
		const code = url.searchParams.get("error_code") || hash.get("error_code");
		if (!callbackProvider && !callbackError && !description && !code) return;

		for (const key of ["error", "error_description", "error_code"]) {
			url.searchParams.delete(key);
			hash.delete(key);
		}
		url.searchParams.delete("link_provider");
		url.searchParams.set("tab", "settings");
		if (window.location.hash && (callbackError || description || code)) {
			url.hash = hash.toString();
		}
		window.history.replaceState(window.history.state, "", url.toString());

		if (callbackError || description || code) {
			const identityExists =
				/identity_already_exists|identity already exists/i.test(
					`${callbackError ?? ""} ${code ?? ""} ${description ?? ""}`,
				);
			if (identityExists && isProvider(callbackProvider)) {
				setDialog({ kind: "verify", provider: callbackProvider });
			} else {
				setError(
					description || callbackError || "Could not link this account.",
				);
			}
		} else if (isProvider(callbackProvider)) {
			setNeedsRefresh(true);
			refreshUser()
				.then(() => {
					setNeedsRefresh(false);
				})
				.catch(() => {
					setError("Could not refresh connected accounts. Please retry.");
				});
		}
	}, [userId, refreshUser]);

	useEffect(() => {
		if (!userId) return;
		let active = true;
		setPreviewLoading(true);
		getPendingAccountTransfer()
			.then((pending) => {
				if (!active) return;
				if (pending) {
					setDialog({ kind: "confirm", pending });
				} else if (previewRetry > 0) {
					setDialog(null);
					setError(
						"No pending verification was found. Please try linking again.",
					);
				}
			})
			.catch((cause: unknown) => {
				if (!active) return;
				setDialog({ kind: "previewError" });
				setError(
					errorMessage(cause, "Could not verify the transfer. Please retry."),
				);
			})
			.finally(() => {
				if (active) setPreviewLoading(false);
			});
		return () => {
			active = false;
		};
	}, [userId, previewRetry]);

	if (!user) return null;

	const accounts = getLinkedAccounts(user);
	const lastMethod = (user.identities?.length ?? 0) <= 1;
	const locked = busy !== null || previewLoading;
	const dialogProvider =
		dialog?.kind === "verify"
			? dialog.provider
			: dialog?.kind === "confirm"
				? dialog.pending.provider
				: null;
	const serviceName = AUTH_SERVICES.find(
		(service) => service.provider === dialogProvider,
	)?.name;

	const run = async (key: string, action: () => Promise<void>) => {
		if (operation.current || previewLoading) return;
		operation.current = true;
		setBusy(key);
		setError(null);

		try {
			await action();
		} catch (cause) {
			setError(errorMessage(cause, "Something went wrong. Please try again."));
		} finally {
			operation.current = false;
			setBusy(null);
		}
	};

	const refresh = async () => {
		setNeedsRefresh(true);
		try {
			await refreshUser();
			setNeedsRefresh(false);
		} catch {
			throw new Error(
				"The change was saved, but connected accounts could not be refreshed. Please retry.",
			);
		}
	};

	const closeDialog = () => {
		if (locked) return;
		void run("cancel", async () => {
			await cancelAccountTransfer();
			setDialog(null);
		});
	};

	const retryPreview = () => {
		if (locked) return;
		setError(null);
		setPreviewLoading(true);
		setPreviewRetry((value) => value + 1);
	};

	return (
		<>
			<Card
				as="section"
				variant="modal"
				heading={
					<span className={styles.heading}>
						<Link size={18} aria-hidden="true" />
						<span>Connected accounts</span>
					</span>
				}
				className={styles.card}
				aria-busy={locked}
			>
				<blockquote className={styles.description}>
					Connect your accounts to sign in with any of these services. Verified
					connections appear on your public profile.
				</blockquote>
				<div className={styles.services}>
					{AUTH_SERVICES.map(({ provider, name }) => {
						const account = accounts.find((item) => item.provider === provider);
						return (
							<div className={styles.service} key={provider}>
								<div className={styles.icon}>
									<ServiceIcon provider={provider} />
								</div>
								<div className={styles.details}>
									<div className={styles.name}>{name}</div>
									<p className={styles.subtitle}>
										{account
											? account.label || "Account connected"
											: "Not connected"}
									</p>
								</div>
								<Button
									variant="secondary"
									size="sm"
									className={styles.action}
									loading={
										busy === `${account ? "unlink" : "link"}-${provider}`
									}
									disabled={
										blocked ||
										locked ||
										!!dialog ||
										needsRefresh ||
										(!!account && lastMethod)
									}
									aria-label={`${account ? "Unlink" : "Link"} ${name}`}
									title={
										account && lastMethod
											? "Connect another sign-in method before unlinking this account."
											: undefined
									}
									onClick={() => {
										if (
											blocked ||
											dialog ||
											needsRefresh ||
											(account && lastMethod)
										)
											return;
										void run(
											`${account ? "unlink" : "link"}-${provider}`,
											async () => {
												if (account) {
													await unlinkAccount(provider);
													await refresh();
												} else {
													await startAccountLink(provider);
												}
											},
										);
									}}
								>
									{account ? "Unlink" : "Link"}
								</Button>
							</div>
						);
					})}
				</div>

				{blocked && (
					<p className={styles.note}>
						Account connections cannot be changed while your account is
						restricted or its status is being checked.
					</p>
				)}
				{previewLoading && (
					<p className={styles.note} role="status">
						Checking account verification…
					</p>
				)}
				{!dialog && error && (
					<p className={styles.error} role="alert">
						{error}
					</p>
				)}

				{needsRefresh && (
					<Button
						variant="secondary"
						size="sm"
						disabled={locked}
						loading={busy === "refresh"}
						onClick={() =>
							void run("refresh", async () => {
								await refresh();
							})
						}
					>
						Refresh connections
					</Button>
				)}
			</Card>
			<Modal
				open={dialog !== null}
				onClose={closeDialog}
				title={
					dialog?.kind === "confirm"
						? `Transfer ${serviceName} account?`
						: dialog?.kind === "verify"
							? `${serviceName} is already connected`
							: "Verify account transfer"
				}
				size="sm"
				showClose={!locked}
				closeOnEscape={!locked}
				closeOnOverlay={!locked}
				bodyClassName={styles.modalBody}
				footer={
					<div className={styles.modalActions}>
						<Button
							variant="secondary"
							disabled={locked}
							loading={busy === "cancel"}
							onClick={closeDialog}
						>
							Cancel
						</Button>
						{dialog?.kind === "previewError" ? (
							<Button
								disabled={locked || blocked}
								loading={previewLoading}
								onClick={retryPreview}
							>
								Retry verification
							</Button>
						) : (
							<Button
								variant={dialog?.kind === "confirm" ? "danger" : "primary"}
								disabled={
									locked ||
									blocked ||
									(dialog?.kind === "confirm" && !acknowledged)
								}
								loading={busy === "verify" || busy === "confirm"}
								onClick={() => {
									if (blocked || !dialog) return;
									if (dialog.kind === "verify") {
										void run("verify", () =>
											startAccountTransfer(dialog.provider),
										);
									} else if (dialog.kind === "confirm" && acknowledged) {
										void run("confirm", async () => {
											await confirmAccountTransfer();
											setDialog(null);
											await refresh();
										});
									}
								}}
							>
								{dialog?.kind === "confirm"
									? "Delete old profile & transfer"
									: "Verify ownership"}
							</Button>
						)}
					</div>
				}
			>
				<div
					className={styles.modalIcon}
					data-destructive={dialog?.kind === "confirm" || undefined}
				>
					{dialog?.kind === "confirm" ? (
						<AlertTriangle size={24} aria-hidden="true" />
					) : (
						<ShieldCheck size={24} aria-hidden="true" />
					)}
				</div>
				{dialog?.kind === "verify" && (
					<>
						<p>
							This {serviceName} account is already linked to another Next Music
							profile.
						</p>
						<p>
							First, sign in with {serviceName} to verify that you own it. We
							will then show the verified source profile and ask you to confirm
							the transfer.
						</p>
						<div className={styles.warning}>
							Transferring will permanently delete the old profile and all of
							its likes and playlists. Nothing will be merged into this profile.
						</div>
						<p>
							After transfer, this {serviceName} account belongs exclusively to
							your current profile until you unlink it. Verification alone does
							not delete anything.
						</p>
					</>
				)}
				{dialog?.kind === "confirm" && (
					<>
						<p>
							Ownership verified. This {serviceName} account is connected to:
						</p>
						<div className={styles.sourceProfile}>
							<strong>{dialog.pending.sourceName || "Previous profile"}</strong>
							<span>{dialog.pending.sourceUserId}</span>
						</div>
						<div className={styles.warning}>
							This will permanently delete that profile and all of its likes and
							playlists. This cannot be undone. Its data will not be merged into
							your current profile.
						</div>
						<p>
							The {serviceName} account will transfer exclusively to your
							current profile until you unlink it. Your current likes and
							playlists will stay unchanged.
						</p>
						<p>
							Supabase may automatically connect other provider accounts sharing
							the verified email of this account. They may then be able to sign
							in to your current profile, including accounts from the deleted
							profile.
						</p>
						<label className={styles.acknowledgement}>
							<input
								type="checkbox"
								checked={acknowledged}
								disabled={locked || blocked}
								onChange={(event) => setAcknowledged(event.target.checked)}
							/>
							<span>
								I own or control all accounts sharing this verified email and
								understand that they may gain access to this profile.
							</span>
						</label>
					</>
				)}
				{dialog?.kind === "previewError" && (
					<p>
						We could not load a verified source profile. No deletion has been
						confirmed. Retry verification or cancel to discard the pending
						transfer.
					</p>
				)}
				{error && (
					<div>
						<p className={styles.error} role="alert">
							{error}
						</p>
						{dialog?.kind === "confirm" && (
							<Button
								variant="ghost"
								size="sm"
								disabled={locked || blocked}
								onClick={retryPreview}
							>
								Refresh verification
							</Button>
						)}
					</div>
				)}
				{blocked && (
					<p className={styles.note}>
						Account transfers are unavailable while your account is restricted
						or its status is being checked.
					</p>
				)}
			</Modal>
		</>
	);
}
