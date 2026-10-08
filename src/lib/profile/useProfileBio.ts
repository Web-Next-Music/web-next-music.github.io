import { useQueryClient } from "@tanstack/react-query";
import { useAuthMutation, usePrivateQuery, useQueryScope } from "@/lib/query";
import { useState, useEffect } from "react";
import { getOwnProfile, saveBio } from "@/lib/supabase/publicProfile";

export function useProfileBio(userId: string | undefined) {
	const client = useQueryClient();
	const auth = useQueryScope();
	const query = usePrivateQuery(
		userId,
		"bio",
		async () => (await getOwnProfile(userId!))?.bio ?? "",
	);
	const bio = query.data ?? "";
	const bioLoading = Boolean(userId) && query.isPending;
	const [editingBio, setEditingBio] = useState(false);
	const [bioInput, setBioInput] = useState("");
	const mutation = useAuthMutation({
		mutationFn: (value: string) => saveBio(userId!, value),
		onSuccess: (_, value) => {
			client.setQueryData(query.queryKey, value);
			void client.invalidateQueries({ queryKey: ["public", userId] });
		},
	});
	const bioSaving = mutation.isPending;
	const [bioError, setBioError] = useState<string | null>(null);

	useEffect(() => {
		setBioInput("");
		setEditingBio(false);
		setBioError(null);
	}, [userId, auth.scope.generation]);

	const handleSaveBio = async () => {
		if (
			!userId ||
			userId !== auth.scope.viewer ||
			!auth.isCurrent() ||
			bioSaving
		)
			return;
		setBioError(null);
		try {
			await mutation.mutateAsync(bioInput);
			if (!auth.isCurrent()) return;
			setEditingBio(false);
		} catch (error) {
			if (!auth.isCurrent()) return;
			setBioError(
				error instanceof Error ? error.message : "Could not save bio.",
			);
		}
	};

	return {
		bioError: bioError ?? (query.isError ? "Could not load bio." : null),
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
