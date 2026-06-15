import { useState, useEffect } from "react";
import { getOwnProfile, saveBio } from "@/lib/supabase/publicProfile";

export function useProfileBio(userId: string | undefined) {
	const [bio, setBio] = useState("");
	const [bioLoading, setBioLoading] = useState(false);
	const [editingBio, setEditingBio] = useState(false);
	const [bioInput, setBioInput] = useState("");
	const [bioSaving, setBioSaving] = useState(false);

	useEffect(() => {
		if (!userId) return;
		setBioLoading(true);
		getOwnProfile(userId).then((p) => {
			if (p?.bio) setBio(p.bio);
			setBioLoading(false);
		});
	}, [userId]);

	const handleSaveBio = async () => {
		if (!userId) return;
		setBioSaving(true);
		await saveBio(userId, bioInput);
		setBio(bioInput);
		setEditingBio(false);
		setBioSaving(false);
	};

	return {
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
