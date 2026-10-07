"use client";

import { useEffect, useState } from "react";
import {
	completeAccountTransferVerification,
	cancelAccountTransfer,
} from "@/lib/auth/accountLinks";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function AccountLinkCallback() {
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		let active = true;
		completeAccountTransferVerification()
			.then(() => {
				if (active) window.location.replace("/profile?tab=settings");
			})
			.catch((cause: unknown) => {
				if (active)
					setError(
						cause instanceof Error
							? cause.message
							: "Could not verify account ownership.",
					);
			});
		return () => {
			active = false;
		};
	}, []);
	return (
		<Card as="section" variant="modal" heading="Account verification">
			{error ? (
				<>
					<p role="alert">{error}</p>
					<Button
						onClick={() => {
							void cancelAccountTransfer().then(() =>
								window.location.replace("/profile?tab=settings"),
							);
						}}
					>
						Back to settings
					</Button>
				</>
			) : (
				<p role="status">
					Verifying ownership. Your current profile will not be changed until
					you confirm the transfer.
				</p>
			)}
		</Card>
	);
}
