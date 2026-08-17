"use client";

import styles from "./ServerLoadError.module.scss";

interface Props {
	server: string;
	port: string;
	scheme: "https" | "http";
	onRetry: () => void;
}

export default function ServerLoadError({
	server,
	port,
	scheme,
	onRetry,
}: Props) {
	const directUrl = `${scheme}://${server}:${port}`;

	return (
		<div className={styles.box}>
			<div className={styles.icon}>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
					<path
						d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</div>
			<div className={styles.body}>
				<div className={styles.title}>
					Couldn't load settings for this server
				</div>
				<div className={styles.hint}>
					Make sure you're signed in with a GitHub account whitelisted on this
					server
					{scheme === "https" ? (
						<>
							, and that this browser trusts its certificate. If it uses a
							self-signed one, open{" "}
							<a
								className={styles.hintLink}
								href={directUrl}
								target="_blank"
								rel="noreferrer"
							>
								{directUrl}
							</a>{" "}
							directly once, accept the warning, then retry here
						</>
					) : null}
				</div>
				<div className={styles.actions}>
					<button type="button" className={styles.retryBtn} onClick={onRetry}>
						Retry
					</button>
				</div>
			</div>
		</div>
	);
}
