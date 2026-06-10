export interface GHItem {
	name: string;
	path: string;
	type: "file" | "dir" | "symlink" | "submodule";
	download_url: string | null;
	sha: string;
	size: number;
	url: string;
	html_url: string | null;
}

export interface GHReleaseAsset {
	name: string;
	browser_download_url: string;
}

export interface GHLatestRelease {
	assets: GHReleaseAsset[];
}

export interface Stargazer {
	login: string;
	avatar_url: string;
	html_url: string;
}

export interface ReleaseAsset {
	name: string;
	browser_download_url: string;
	size: number;
}

export interface RepoRelease {
	tag_name: string;
	name: string;
	prerelease: boolean;
	html_url: string;
	assets: ReleaseAsset[];
}
