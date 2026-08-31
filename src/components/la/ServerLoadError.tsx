"use client";

import Callout, { CalloutButton, CalloutLink } from "@/components/ui/Callout";

interface Props {
	server: string;
	port: string;
	scheme: "https" | "http";
	onRetry: () => void;
}

export default function ServerLoadError({
	server,
	port,
	scheme,
	onRetry,
}: Props) {
	const directUrl = port
		? `${scheme}://${server}:${port}`
		: `${scheme}://${server}`;

	return (
		<Callout
			tone="danger"
			title="Couldn't load settings for this server"
			actions={<CalloutButton onClick={onRetry}>Retry</CalloutButton>}
		>
			Make sure you're signed in with a GitHub account whitelisted on this
			server
			{scheme === "https" ? (
				<>
					, and that this browser trusts its certificate. If it uses a
					self-signed one, open{" "}
					<CalloutLink href={directUrl} target="_blank" rel="noreferrer">
						{directUrl}
					</CalloutLink>{" "}
					directly once, accept the warning, then retry here
				</>
			) : null}
		</Callout>
	);
}
