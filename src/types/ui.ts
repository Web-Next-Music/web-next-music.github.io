import type { ReactNode, RefObject } from "react";
import type { NowPlaying } from "./player";
import type { LegacyTrack } from "./track";
import type { Playlist } from "@/lib/supabase/playlists";

export interface CardShellProps {
	delay?: number;
	live?: boolean;
	statusDot?: ReactNode;
	cover: ReactNode;
	title: ReactNode;
	artist: ReactNode;
	timeRow: ReactNode;
}

export interface GithubAsset {
	name: string;
	browser_download_url: string;
	size: number;
}

export interface GithubRelease {
	tag_name: string;
	prerelease: boolean;
	html_url: string;
	assets: GithubAsset[];
}

export interface PlayBtnProps {
	track: NowPlaying;
}

export interface SearchBarProps {
	value: string;
	onChange: (v: string) => void;
}

export interface LegacyListProps {
	tracks: LegacyTrack[];
	query: string;
	playlists: Playlist[];
}

export interface PlayerContextValue {
	nowPlaying: NowPlaying | null;
	isPlaying: boolean;
	play: (track: NowPlaying) => void;
	pause: () => void;
	resume: () => void;
	close: () => void;
	seek: (seconds: number) => void;
	setVolume: (volume: number) => void;
	setMuted: (muted: boolean) => void;
	audioRef: RefObject<HTMLAudioElement | null>;
}
