"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, usePrivateQuery } from "@/lib/query";
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
	const client = useQueryClient();
	const query = usePrivateQuery(userId, "visibility", () =>
		getProfileVisibility(userId),
	);
	const mutation = useMutation({
		scope: { id: `visibility:${userId}` },
		mutationFn: async ({
			value,
			setting,
		}: {
			value: boolean;
			setting: "likes" | "playlists" | "accounts";
		}) => {
			const save =
				setting === "likes"
					? saveProfileLikesVisibility
					: setting === "playlists"
						? saveProfilePlaylistsVisibility
						: saveProfileAccountLinksVisibility;
			await save(userId, value);
		},
		onSettled: async () => {
			await Promise.all([
				client.invalidateQueries({
					queryKey: queryKeys.private(userId, "visibility"),
				}),
				client.invalidateQueries({ queryKey: ["public", userId] }),
			]);
		},
	});
	const enabled = query.data?.public_liked_tracks ?? true;
	const playlistsEnabled = query.data?.public_playlists ?? true;
	const accountsEnabled = query.data?.show_account_links ?? true;
	const loading = query.isPending;
	const saving = mutation.isPending;
	const error = query.isError
		? "Could not load profile settings."
		: mutation.isError
			? "Could not save profile settings. Please try again."
			: null;
	const save = (
		value: boolean,
		setting: "likes" | "playlists" | "accounts",
	) => {
		if (!disabled && !loading && !saving) mutation.mutate({ value, setting });
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
						<Button variant="secondary" onClick={() => void query.refetch()}>
							Retry
						</Button>
					</div>
				)}
			</Card>
			<AccountConnections disabled={disabled} />
		</div>
	);
}
