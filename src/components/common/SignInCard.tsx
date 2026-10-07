"use client";

import ServiceIcon from "@/components/profile/ServiceIcon";
import { AUTH_SERVICES, type AccountProvider } from "@/lib/auth/accountLinks";
import styles from "./SignInCard.module.scss";

interface Props {
	loading?: boolean;
	error?: string | null;
	onSignIn: () => void;
	onProviderSignIn?: (provider: AccountProvider) => void;
	loadingProvider?: AccountProvider | null;
	onClose?: () => void;
}

export default function SignInCard({
	loading,
	error,
	onSignIn,
	onProviderSignIn,
	loadingProvider,
	onClose,
}: Props) {
	const busy = Boolean(loading || loadingProvider);
	const services = onProviderSignIn
		? AUTH_SERVICES
		: AUTH_SERVICES.filter((service) => service.provider === "github");

	return (
		<div
			className={`${styles.cardLayout}${onProviderSignIn ? ` ${styles.multiProvider}` : ""}`}
			style={{
				backgroundImage:
					"linear-gradient(135deg, var(--surface) 0%, transparent 30%, var(--surface) 100%), url(/ui/Kagami.webp)",
				backgroundPosition: "center",
				backgroundSize: "cover",
				backgroundRepeat: "no-repeat",
			}}
		>
			{onClose && (
				<button
					type="button"
					className={styles.closeBtnLayout}
					onClick={onClose}
					aria-label="Close"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
						<path
							d="M18 6L6 18M6 6l12 12"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
						/>
					</svg>
				</button>
			)}
			<span className={styles.title}>Sign in</span>
			<div className={styles.copy}>
				{services.map((service) => {
					const redirecting =
						busy &&
						(loadingProvider
							? loadingProvider === service.provider
							: service.provider === "github");
					return (
						<button
							key={service.provider}
							type="button"
							className={styles.githubBtnLayout}
							onClick={() =>
								onProviderSignIn
									? onProviderSignIn(service.provider)
									: onSignIn()
							}
							disabled={busy}
							aria-busy={redirecting}
						>
							<ServiceIcon provider={service.provider} width={17} height={17} />
							{redirecting ? "Redirecting…" : `Continue with ${service.name}`}
						</button>
					);
				})}
				{error && (
					<span className={styles.errorLayout} role="alert">
						{error}
					</span>
				)}
			</div>
		</div>
	);
}
