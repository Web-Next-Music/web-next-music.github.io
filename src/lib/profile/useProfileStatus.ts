import { useEffect, useRef, useState } from "react";
import { getOwnStatus, saveStatus } from "@/lib/supabase/publicProfile";

export function useProfileStatus(userId: string | undefined) {
	const [status, setStatus] = useState("");
	const [input, updateInput] = useState("");
	const setInput = (value: string) => {
		updateInput(
			Array.from(value.replace(/\r\n|[\r\n]/g, " "))
				.slice(0, 64)
				.join(""),
		);
	};
	const [editing, setEditing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [reload, setReload] = useState(0);
	const generation = useRef(0);
	const savePending = useRef(false);

	useEffect(() => {
		const current = ++generation.current;
		setStatus("");
		setInput("");
		setEditing(false);
		setSaving(false);
		savePending.current = false;
		setError(null);
		setLoading(Boolean(userId));
		if (userId) {
			getOwnStatus(userId)
				.then((value) => {
					if (generation.current !== current) return;
					setStatus(value);
					updateInput(value);
				})
				.catch(() => {
					if (generation.current === current)
						setError("Could not load your status. Please retry.");
				})
				.finally(() => {
					if (generation.current === current) setLoading(false);
				});
		}
		return () => {
			generation.current++;
		};
	}, [userId, reload]);

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
		if (!userId || loading || savePending.current) return;
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
			const value = await saveStatus(userId, input.trim());
			if (generation.current !== current) return;
			setStatus(value);
			updateInput(value);
			setEditing(false);
		} catch {
			if (generation.current === current)
				setError(
					"Could not save your status. Your changes have not been saved.",
				);
		} finally {
			if (generation.current === current) {
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
		error,
		startEditing,
		cancel,
		save,
		retry: () => setReload((value) => value + 1),
	};
}
