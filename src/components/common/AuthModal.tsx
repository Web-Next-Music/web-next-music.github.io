"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import Modal from "@/components/ui/Modal";
import SignInCard from "@/components/common/SignInCard";
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

	const handleGitHub = useCallback(async () => {
		setLoading(true);
		setError(null);
		const err = await signInWithGitHub();
		if (err) {
			setError(err);
			setLoading(false);
		}
	}, [signInWithGitHub]);

	return (
		<Modal
			open={authModalOpen}
			onClose={closeAuthModal}
			showClose={false}
			className={styles.modal}
			bodyClassName={styles.body}
		>
			<SignInCard
				loading={loading}
				error={error}
				onSignIn={handleGitHub}
				onClose={closeAuthModal}
			/>
		</Modal>
	);
}
