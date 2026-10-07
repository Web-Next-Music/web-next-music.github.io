"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Button from "@/components/ui/Button";
import {
	AUTH_SERVICES,
	getLinkedAccounts,
	getPublicAccountLinks,
} from "@/lib/auth/accountLinks";
import { ACCOUNT_LINKS_VISIBILITY_EVENT } from "@/lib/supabase/publicProfile";
import ServiceIcon from "./ServiceIcon";
import styles from "./ProfileConnections.module.scss";

type Accounts = ReturnType<typeof getLinkedAccounts>;

function safeAccountUrl(value: string | null | undefined): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === "https:" ? url.href : null;
	} catch {
		return null;
	}
}

export default function ProfileConnections({
	accounts,
	className,
}: {
	accounts: Accounts;
	className?: string;
}) {
	if (!accounts.length) return null;

	return (
		<div
			className={`${styles.connections} ${className ?? ""}`}
			aria-label="Connected accounts"
		>
			{AUTH_SERVICES.flatMap(({ provider, name }) => {
				const account = accounts.find((item) => item.provider === provider);
				if (!account) return [];
				const url = safeAccountUrl(account.url);
				const content = (
					<>
						<ServiceIcon provider={provider} width={18} height={18} />
						<span className={styles.serviceName}>{name}</span>
						{account.label && (
							<span className={styles.username}>{account.label}</span>
						)}
					</>
				);
				return [
					url ? (
						<a
							key={provider}
							className={styles.pill}
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							title={account.label || name}
							aria-label={`${name}${account.label ? `: ${account.label}` : ""} (opens in a new tab)`}
						>
							{content}
						</a>
					) : (
						<span
							key={provider}
							className={styles.pill}
							title={account.label || name}
						>
							{content}
						</span>
					),
				];
			})}
		</div>
	);
}

export function PublicProfileConnections({
	userId,
	user,
	className,
}: {
	userId: string;
	user?: User;
	className?: string;
}) {
	const ownUser = user?.id === userId ? user : undefined;
	const [result, setResult] = useState<{
		userId: string;
		accounts: Accounts;
	} | null>(null);
	const [failedUserId, setFailedUserId] = useState<string | null>(null);
	const [retry, setRetry] = useState(0);

	useEffect(() => {
		const changed = (event: Event) => {
			const detail = (
				event as CustomEvent<{ userId: string; enabled: boolean }>
			).detail;
			if (detail.userId !== userId) return;
			setResult({ userId, accounts: [] });
			setFailedUserId(null);
			setRetry((value) => value + 1);
		};
		window.addEventListener(ACCOUNT_LINKS_VISIBILITY_EVENT, changed);
		return () =>
			window.removeEventListener(ACCOUNT_LINKS_VISIBILITY_EVENT, changed);
	}, [userId]);

	useEffect(() => {
		let active = true;
		setResult(null);
		setFailedUserId(null);
		getPublicAccountLinks(userId)
			.then((accounts) => {
				if (active) setResult({ userId, accounts });
			})
			.catch(() => {
				if (active) setFailedUserId(userId);
			});
		return () => {
			active = false;
		};
	}, [userId, ownUser, retry]);

	if (failedUserId === userId) {
		return (
			<div className={`${styles.unavailable} ${className ?? ""}`}>
				<span role="status">Connections unavailable</span>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setRetry((value) => value + 1)}
				>
					Retry
				</Button>
			</div>
		);
	}

	if (result?.userId !== userId) return null;
	return (
		<ProfileConnections accounts={result.accounts} className={className} />
	);
}
