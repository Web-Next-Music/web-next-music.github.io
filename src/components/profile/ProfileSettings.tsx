"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import {
	getProfileLikesVisibility,
	saveProfileLikesVisibility,
} from "@/lib/supabase/publicProfile";
import styles from "./profile.module.scss";

export default function ProfileSettings({
	userId,
	disabled,
}: {
	userId: string;
	disabled: boolean;
}) {
	const [enabled, setEnabled] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [reload, setReload] = useState(0);

	useEffect(() => {
		let active = true;
		setLoading(true);
		setError(null);
		getProfileLikesVisibility(userId)
			.then((value) => {
				if (active) setEnabled(value);
			})
			.catch(() => {
				if (active) setError("Could not load profile settings.");
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [userId, reload]);

	const save = async (value: boolean) => {
		if (disabled || loading || saving) return;
		setSaving(true);
		setError(null);
		try {
			await saveProfileLikesVisibility(userId, value);
			setEnabled(value);
		} catch {
			setError("Could not save profile settings. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Card
			as="section"
			variant="modal"
			heading="Profile settings"
			className={styles.profileContentCard}
			aria-busy={loading || saving}
		>
			{loading ? (
				<div className={styles.loadingSmall}>Loading…</div>
			) : (
				<Switch
					className={styles.profileSettingsRow}
					checked={enabled}
					onCheckedChange={(value) => void save(value)}
					disabled={
						disabled || saving || error === "Could not load profile settings."
					}
					label="Show liked tracks on public profile"
				/>
			)}
			{error && (
				<div role="alert">
					<p className={styles.statusError}>{error}</p>
					<Button
						variant="secondary"
						onClick={() => setReload((value) => value + 1)}
					>
						Retry
					</Button>
				</div>
			)}
		</Card>
	);
}
