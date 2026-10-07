"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import type { AccountProvider } from "@/lib/auth/accountLinks";
import Modal from "@/components/ui/Modal";
import SignInCard from "@/components/common/SignInCard";
import styles from "./AuthModal.module.scss";

export default function AuthModal() {
	const { authModalOpen, closeAuthModal, signInWithProvider } = useAuth();
	const [error, setError] = useState<string | null>(null);
	const [loadingProvider, setLoadingProvider] =
		useState<AccountProvider | null>(null);
	const busy = useRef(false);
	const attempt = useRef(0);

	useEffect(() => {
		if (!authModalOpen) {
			setError(null);
			setLoadingProvider(null);
			busy.current = false;
			attempt.current += 1;
		}
	}, [authModalOpen]);

	const handleProvider = useCallback(
		async (provider: AccountProvider) => {
			if (busy.current) return;
			busy.current = true;
			const currentAttempt = ++attempt.current;
			setLoadingProvider(provider);
			setError(null);
			try {
				const err = await signInWithProvider(provider);
				if (currentAttempt !== attempt.current) return;
				if (err) {
					setError(err);
					setLoadingProvider(null);
					busy.current = false;
				}
			} catch (cause: unknown) {
				if (currentAttempt !== attempt.current) return;
				setError(cause instanceof Error ? cause.message : "Could not sign in.");
				setLoadingProvider(null);
				busy.current = false;
			}
		},
		[signInWithProvider],
	);

	return (
		<Modal
			open={authModalOpen}
			onClose={closeAuthModal}
			showClose={false}
			className={styles.box}
			bodyClassName={styles.body}
		>
			<SignInCard
				loading={loadingProvider !== null}
				loadingProvider={loadingProvider}
				error={error}
				onSignIn={() => handleProvider("github")}
				onProviderSignIn={handleProvider}
				onClose={closeAuthModal}
			/>
		</Modal>
	);
}
