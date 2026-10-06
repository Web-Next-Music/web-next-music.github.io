import Image from "next/image";
import { memo } from "react";
import type { DDetectorTrack } from "@/lib/track/ddetector";
import styles from "@/app/ddetector/page.module.scss";

export type TrackStatus = "pending" | "found" | "none" | "error";

const BADGE_CFG: Record<TrackStatus, { cls: string; label: string }> = {
	pending: { cls: styles.badgePending, label: "…" },
	found: { cls: styles.badgeFound, label: "found" },
	none: { cls: styles.badgeNone, label: "clean" },
	error: { cls: styles.badgeError, label: "no lyrics" },
};

export interface DrugCard {
	track: DDetectorTrack;
	lines: Array<{ ts: string | null; html: string }>;
	allLines?: Array<{ ts: string | null; html: string; isDrug: boolean }>;
}

export interface ContextMenuState {
	x: number;
	y: number;
	track: DDetectorTrack;
	hasAllLines?: boolean;
}

function handleCoverError(e: React.SyntheticEvent<HTMLImageElement>) {
	(e.currentTarget.parentNode as HTMLElement).innerHTML =
		`<div class="${styles.coverPh}">♪</div>`;
}

export interface TrackRowProps {
	track: DDetectorTrack;
	index: number;
	status: TrackStatus;
	date: string | undefined;
	isActive: boolean;
	isIgnored: boolean;
	onClick: (track: DDetectorTrack) => void;
	onContextMenu: (e: React.MouseEvent, track: DDetectorTrack) => void;
}

const TrackRow = memo(function TrackRow({
	track,
	index,
	status,
	date,
	isActive,
	isIgnored,
	onClick,
	onContextMenu,
}: TrackRowProps) {
	const badge = BADGE_CFG[status];
	return (
		<div
			className={`${styles.track}${isActive ? ` ${styles.trackActive}` : ""}${isIgnored ? ` ${styles.trackIgnored}` : ""}`}
			onClick={() => onClick(track)}
			onContextMenu={(e) => onContextMenu(e, track)}
		>
			<span className={styles.trackNum}>{index + 1}</span>
			<div className={styles.cover}>
				{track.cover ? (
					<Image
						src={track.cover}
						alt=""
						width={40}
						height={40}
						loading="lazy"
						onError={handleCoverError}
					/>
				) : (
					<div className={styles.coverPh}>♪</div>
				)}
			</div>
			<div className={styles.trackInfo}>
				<div className={styles.trackTitle}>{track.title}</div>
				<div className={styles.trackArtist}>
					{track.artist && <span>{track.artist}</span>}
				</div>
			</div>
			{date && <span className={styles.trackDateBadge}>{date}</span>}
			<span className={`${styles.badge} ${badge.cls}`}>{badge.label}</span>
		</div>
	);
});

export default TrackRow;
