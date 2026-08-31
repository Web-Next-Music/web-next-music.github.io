"use client";

import { useCallback, useRef, useState } from "react";
import { Check as CheckIcon, Plus as PlusIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
	addTrackToPlaylist,
	getPlaylistTracks,
	removeTrackFromPlaylist,
	type Playlist,
} from "@/lib/supabase/playlists";
import IconButton from "@/components/ui/IconButton";
import Menu from "@/components/ui/Menu";
import menuStyles from "@/components/ui/Menu.module.scss";
import { cx } from "@/lib/cx";

export default function AddToPlaylistMenu({
	trackId,
	playlists,
}: {
	trackId: string;
	playlists: Playlist[];
}) {
	const { user, isBanned } = useAuth();
	const [open, setOpen] = useState(false);
	const [inPlaylists, setInPlaylists] = useState<Set<string>>(new Set());
	const btnRef = useRef<HTMLButtonElement>(null);

	const close = useCallback(() => setOpen(false), []);

	if (!user || isBanned || playlists.length === 0) return null;

	const handleOpen = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (isBanned) return;
		if (open) {
			setOpen(false);
			return;
		}
		const results = await Promise.all(
			playlists.map((pl) => getPlaylistTracks(pl.id)),
		);
		const containing = new Set<string>();
		playlists.forEach((pl, i) => {
			if (results[i].some((t) => t.track_id === trackId)) containing.add(pl.id);
		});
		setInPlaylists(containing);
		setOpen(true);
	};

	const handleToggle = async (playlistId: string) => {
		if (inPlaylists.has(playlistId)) {
			await removeTrackFromPlaylist(playlistId, trackId);
			setInPlaylists((prev) => {
				const next = new Set(prev);
				next.delete(playlistId);
				return next;
			});
		} else {
			await addTrackToPlaylist(playlistId, trackId, 0);
			setInPlaylists((prev) => new Set(prev).add(playlistId));
		}
	};

	return (
		<>
			<IconButton
				ref={btnRef}
				label={isBanned ? "Your account is banned" : "Add to playlist"}
				disabled={isBanned}
				onClick={handleOpen}
			>
				<PlusIcon size={13} />
			</IconButton>
			<Menu open={open} onClose={close} anchorRef={btnRef} align="end">
				{playlists.map((pl) => {
					const isIn = inPlaylists.has(pl.id);
					return (
						<button
							key={pl.id}
							type="button"
							role="menuitem"
							className={cx(menuStyles.item, isIn && menuStyles.active)}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								void handleToggle(pl.id);
							}}
						>
							<span className={menuStyles.itemLabel}>{pl.name}</span>
							{isIn && <CheckIcon size={12} />}
						</button>
					);
				})}
			</Menu>
		</>
	);
}
