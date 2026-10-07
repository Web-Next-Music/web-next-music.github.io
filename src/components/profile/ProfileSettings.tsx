"use client";

import { useEffect, useState } from "react";
import { Heart, ListMusic, Link, Shield } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import AccountConnections from "./AccountConnections";
import {
	getProfileVisibility,
	saveProfileLikesVisibility,
	saveProfileAccountLinksVisibility,
	saveProfilePlaylistsVisibility,
} from "@/lib/supabase/publicProfile";
import styles from "./profile.module.scss";

export default function ProfileSettings({
	userId,
	disabled,
}: {
	userId: string;
	disabled: boolean;
}) {
	const [enabled, setEnabled] = useState(true);
	const [playlistsEnabled, setPlaylistsEnabled] = useState(true);
	const [accountsEnabled, setAccountsEnabled] = useState(true);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [reload, setReload] = useState(0);

	useEffect(() => {
		let active = true;
		setLoading(true);
		setError(null);
		getProfileVisibility(userId)
			.then((settings) => {
				if (active) {
					setEnabled(settings.public_liked_tracks);
					setPlaylistsEnabled(settings.public_playlists);
					setAccountsEnabled(settings.show_account_links);
				}
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

	const save = async (
		value: boolean,
		setting: "likes" | "playlists" | "accounts",
	) => {
		if (disabled || loading || saving) return;
		setSaving(true);
		setError(null);
		try {
			if (setting === "likes") {
				await saveProfileLikesVisibility(userId, value);
				setEnabled(value);
			} else if (setting === "playlists") {
				await saveProfilePlaylistsVisibility(userId, value);
				setPlaylistsEnabled(value);
			} else {
				await saveProfileAccountLinksVisibility(userId, value);
				setAccountsEnabled(value);
			}
		} catch {
			setError("Could not save profile settings. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className={styles.profileSettingsStack}>
			<Card
				as="section"
				variant="modal"
				heading={
					<span className={styles.privacyLabel}>
						<Shield size={18} aria-hidden="true" />
						<span>Privacy</span>
					</span>
				}
				className={styles.profileContentCard}
				aria-busy={loading || saving}
			>
				{loading ? (
					<div className={styles.loadingSmall}>Loading…</div>
				) : (
					<>
						<Switch
							className={styles.profileSettingsRow}
							checked={enabled}
							onCheckedChange={(value) => void save(value, "likes")}
							disabled={
								disabled ||
								saving ||
								error === "Could not load profile settings."
							}
							label={
								<span className={styles.privacyLabel}>
									<Heart size={18} aria-hidden="true" />
									<span>Show liked tracks and their count</span>
								</span>
							}
						/>
						<Switch
							className={styles.profileSettingsRow}
							checked={playlistsEnabled}
							onCheckedChange={(value) => void save(value, "playlists")}
							disabled={
								disabled ||
								saving ||
								error === "Could not load profile settings."
							}
							label={
								<span className={styles.privacyLabel}>
									<ListMusic size={18} aria-hidden="true" />
									<span>Show playlists and their count</span>
								</span>
							}
						/>
						<Switch
							className={styles.profileSettingsRow}
							checked={accountsEnabled}
							onCheckedChange={(value) => void save(value, "accounts")}
							disabled={
								disabled ||
								saving ||
								error === "Could not load profile settings."
							}
							label={
								<span className={styles.privacyLabel}>
									<Link size={18} aria-hidden="true" />
									<span>Show connected accounts and GitHub identity</span>
								</span>
							}
						/>
					</>
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
			<AccountConnections disabled={disabled} />
		</div>
	);
}
