"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import SignInCard from "@/components/ui/SignInCard";
import styles from "./AuthModal.module.scss";

export default function AuthModal() {
	const { authModalOpen, closeAuthModal, signInWithGitHub } = useAuth();
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!authModalOpen) {
			setError(null);
			setLoading(false);
		}
	}, [authModalOpen]);

	useEffect(() => {
		if (!authModalOpen) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeAuthModal();
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [authModalOpen, closeAuthModal]);

	const handleGitHub = useCallback(async () => {
		setLoading(true);
		setError(null);
		const err = await signInWithGitHub();
		if (err) {
			setError(err);
			setLoading(false);
		}
	}, [signInWithGitHub]);

	if (!authModalOpen) return null;

	return (
		<div className={styles.overlay} onClick={closeAuthModal}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<SignInCard
					loading={loading}
					error={error}
					onSignIn={handleGitHub}
					onClose={closeAuthModal}
				/>
			</div>
		</div>
	);
}
