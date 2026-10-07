import { useState, useEffect } from "react";
import { getOwnProfile, saveBio } from "@/lib/supabase/publicProfile";

export function useProfileBio(userId: string | undefined) {
	const [bio, setBio] = useState("");
	const [bioLoading, setBioLoading] = useState(false);
	const [editingBio, setEditingBio] = useState(false);
	const [bioInput, setBioInput] = useState("");
	const [bioSaving, setBioSaving] = useState(false);
	const [bioError, setBioError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		setBio("");
		setBioInput("");
		setEditingBio(false);
		setBioError(null);
		if (!userId) return;
		setBioLoading(true);
		getOwnProfile(userId)
			.then((p) => {
				if (active) setBio(p?.bio ?? "");
			})
			.catch(() => {
				if (active) setBioError("Could not load bio.");
			})
			.finally(() => {
				if (active) setBioLoading(false);
			});
		return () => {
			active = false;
		};
	}, [userId]);

	const handleSaveBio = async () => {
		if (!userId || bioSaving) return;
		setBioSaving(true);
		setBioError(null);
		try {
			await saveBio(userId, bioInput);
			setBio(bioInput);
			setEditingBio(false);
		} catch (error) {
			setBioError(
				error instanceof Error ? error.message : "Could not save bio.",
			);
		} finally {
			setBioSaving(false);
		}
	};

	return {
		bioError,
		bio,
		bioLoading,
		editingBio,
		setEditingBio,
		bioInput,
		setBioInput,
		bioSaving,
		handleSaveBio,
	};
}
