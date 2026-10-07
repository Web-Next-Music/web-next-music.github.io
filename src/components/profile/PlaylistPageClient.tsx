"use client";

import ProfilePageClient from "./ProfilePageClient";

export default function PlaylistPageClient({
	userId,
	playlistId,
}: {
	userId: string;
	playlistId: string;
}) {
	return (
		<ProfilePageClient idOverride={userId} playlistIdOverride={playlistId} />
	);
}
