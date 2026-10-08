import { useQueryClient } from "@tanstack/react-query";
import { useAuthMutation, usePrivateQuery, useQueryScope } from "@/lib/query";
import { useEffect, useRef, useState } from "react";
import { getOwnStatus, saveStatus } from "@/lib/supabase/publicProfile";

export function useProfileStatus(userId: string | undefined) {
	const client = useQueryClient();
	const auth = useQueryScope();
	const query = usePrivateQuery(userId, "status", () => getOwnStatus(userId!));
	const status = query.data ?? "";
	const mutation = useAuthMutation({
		mutationFn: (value: string) => saveStatus(userId!, value),
		onSuccess: (value) => {
			client.setQueryData(query.queryKey, value);
			void client.invalidateQueries({ queryKey: ["public", userId] });
		},
	});
	const [input, updateInput] = useState("");
	const setInput = (value: string) => {
		updateInput(
			Array.from(value.replace(/\r\n|[\r\n]/g, " "))
				.slice(0, 64)
				.join(""),
		);
	};
	const [editing, setEditing] = useState(false);
	const loading = Boolean(userId) && query.isPending;
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const generation = useRef(0);
	const savePending = useRef(false);

	useEffect(() => {
		++generation.current;
		setInput("");
		setEditing(false);
		setSaving(false);
		savePending.current = false;
		setError(null);
		return () => {
			generation.current++;
		};
	}, [userId, auth.scope.generation]);

	const startEditing = () => {
		updateInput(status);
		setError(null);
		setEditing(true);
	};

	const cancel = () => {
		if (savePending.current) return;
		updateInput(status);
		setError(null);
		setEditing(false);
	};

	const save = async () => {
		if (
			!userId ||
			userId !== auth.scope.viewer ||
			!auth.isCurrent() ||
			loading ||
			savePending.current
		)
			return;
		if (/[\r\n]/.test(input)) {
			setError("Status must be a single line.");
			return;
		}
		if (Array.from(input).length > 64) {
			setError("Status must be at most 64 characters.");
			return;
		}
		if (input.trim() === status) {
			setEditing(false);
			return;
		}
		const current = generation.current;
		savePending.current = true;
		setSaving(true);
		setError(null);
		try {
			const value = await mutation.mutateAsync(input.trim());
			if (!auth.isCurrent() || generation.current !== current) return;
			updateInput(value);
			setEditing(false);
		} catch {
			if (auth.isCurrent() && generation.current === current)
				setError(
					"Could not save your status. Your changes have not been saved.",
				);
		} finally {
			if (auth.isCurrent() && generation.current === current) {
				savePending.current = false;
				setSaving(false);
			}
		}
	};

	return {
		status,
		input,
		setInput,
		editing,
		loading,
		saving,
		error:
			error ??
			(query.isError ? "Could not load your status. Please retry." : null),
		startEditing,
		cancel,
		save,
		retry: () => void query.refetch(),
	};
}
