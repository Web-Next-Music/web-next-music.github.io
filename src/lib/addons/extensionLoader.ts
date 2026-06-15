import type { Extension, ReleaseAsset, Tag } from "@/types/addon";
import type { GHItem, GHReleaseAsset, GHLatestRelease } from "@/types/github";

const OWNER = "Web-Next-Music";
const REPO = "Next-Music-Extensions";
const GH = "https://api.github.com";

function ghHeaders(token?: string): Record<string, string> {
	const h: Record<string, string> = {
		Accept: "application/vnd.github.v3+json",
	};
	if (token) h["Authorization"] = `Bearer ${token}`;
	return h;
}

async function ghContents(
	owner: string,
	repo: string,
	path: string,
	token?: string,
): Promise<GHItem[]> {
	const url = path
		? `${GH}/repos/${owner}/${repo}/contents/${path}`
		: `${GH}/repos/${owner}/${repo}/contents`;
	const res = await fetch(url, { headers: ghHeaders(token) });
	if (!res.ok)
		throw new Error(`ghContents ${res.status}: ${owner}/${repo}/${path}`);
	return res.json() as Promise<GHItem[]>;
}

async function rawFetch(
	owner: string,
	repo: string,
	branch: string,
	file: string,
): Promise<string> {
	const res = await fetch(
		`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file}`,
	);
	if (!res.ok) throw new Error(`raw 404: ${file}`);
	return res.text();
}

function parseGitmodules(text: string): Record<string, string> {
	const map: Record<string, string> = {};
	for (const block of text.split(/(?=\[submodule\s+"[^"]*"\])/)) {
		const pm = block.match(/path\s*=\s*(.+)/);
		const um = block.match(/url\s*=\s*(.+)/);
		if (pm && um) map[pm[1].trim()] = um[1].trim();
	}
	return map;
}

function normalizeGitUrl(url: string) {
	return url
		.replace(/^git:\/\/github\.com\//, "https://github.com/")
		.replace(/^git@github\.com:/, "https://github.com/");
}

function extractGhOwnerRepo(url: string): [string, string] | null {
	const m = normalizeGitUrl(url).match(
		/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/,
	);
	return m ? [m[1], m[2]] : null;
}

async function loadGitmodules(): Promise<Record<string, string>> {
	for (const branch of ["main", "master", "HEAD"]) {
		try {
			const text = await rawFetch(OWNER, REPO, branch, ".gitmodules");
			if (text.length > 0) return parseGitmodules(text);
		} catch {}
	}
	return {};
}

const isImg = (n: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(n);

function pickImg(list: GHItem[]): string | null {
	return (
		list.find(
			(i) =>
				i.type === "file" &&
				/^(image|icon|logo|preview)\./i.test(i.name) &&
				isImg(i.name),
		)?.download_url ||
		list.find((i) => i.type === "file" && isImg(i.name))?.download_url ||
		null
	);
}

async function findLogoRecursive(
	owner: string,
	repo: string,
	dirPath: string,
	depth = 0,
	token?: string,
): Promise<string | null> {
	if (depth > 5) return null;
	try {
		const items = await ghContents(owner, repo, dirPath, token);
		const logo = pickImg(items);
		if (logo) return logo;
		for (const sub of items.filter((i) => i.type === "dir")) {
			const found = await findLogoRecursive(
				owner,
				repo,
				sub.path,
				depth + 1,
				token,
			);
			if (found) return found;
		}
	} catch {}
	return null;
}

async function findBrandingDir(
	owner: string,
	repo: string,
	items: GHItem[],
	depth = 0,
	token?: string,
): Promise<string | null> {
	const branding = items.find(
		(i) => i.type === "dir" && /^branding$/i.test(i.name),
	);
	if (branding) return branding.path;
	if (depth >= 3) return null;
	for (const sub of items.filter((i) => i.type === "dir")) {
		try {
			const subItems = await ghContents(owner, repo, sub.path, token);
			const found = await findBrandingDir(
				owner,
				repo,
				subItems,
				depth + 1,
				token,
			);
			if (found) return found;
		} catch {}
	}
	return null;
}

async function getFolderMeta(
	owner: string,
	repo: string,
	folderPath: string,
	token?: string,
) {
	try {
		const items = await ghContents(owner, repo, folderPath, token);

		const brandingPath = await findBrandingDir(owner, repo, items, 0, token);
		let logo: string | null = brandingPath
			? await findLogoRecursive(owner, repo, brandingPath, 0, token)
			: null;

		if (!logo) logo = pickImg(items);

		if (!logo) {
			for (const sub of items.filter((i) => i.type === "dir")) {
				try {
					const subItems = await ghContents(owner, repo, sub.path, token);
					if (
						subItems.some(
							(i) => i.type === "file" && /\.(css|js|json)$/i.test(i.name),
						)
					) {
						logo = pickImg(subItems);
						if (logo) break;
					}
				} catch {}
			}
		}

		const rmItem = items.find(
			(i) => i.type === "file" && /^readme\.md$/i.test(i.name),
		);
		const jsItem = items.find(
			(i) => i.type === "file" && /^user\.js$/i.test(i.name),
		);

		const rawBase =
			owner === OWNER && folderPath
				? `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${folderPath}/`
				: `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/`;

		return {
			logo: logo ?? null,
			readmeUrl: rmItem?.download_url ?? null,
			readmeBaseUrl: rawBase,
			userJsUrl: jsItem?.download_url ?? null,
		};
	} catch {
		return {
			logo: null,
			readmeUrl: null,
			readmeBaseUrl: null,
			userJsUrl: null,
		};
	}
}

async function getAllReleaseAssets(
	owner: string,
	repo: string,
	token?: string,
): Promise<ReleaseAsset[]> {
	try {
		const res = await fetch(`${GH}/repos/${owner}/${repo}/releases/latest`, {
			headers: ghHeaders(token),
		});
		if (!res.ok) return [];
		const release = (await res.json()) as GHLatestRelease;
		if (!release.assets?.length) return [];
		return release.assets.map((a: GHReleaseAsset) => ({
			name: a.name,
			url: a.browser_download_url,
			ext: a.name.endsWith(".tar.gz")
				? ".tar.gz"
				: (a.name.match(/\.[^.]+$/) ?? [""])[0],
		}));
	} catch {
		return [];
	}
}

function deriveTagsAndClients(
	assets: ReleaseAsset[],
	name: string,
	path: string,
): { tags: Tag[]; clients: Extension["clients"] } {
	const tags = new Set<Tag>();
	const clients = new Set<Extension["clients"][number]>();

	if (assets.length > 0) {
		for (const { name: n } of assets) {
			const ln = n.toLowerCase();
			tags.add("Next Music");
			clients.add("nm");
			if (ln.endsWith(".pext") || ln.includes(".ps.")) {
				tags.add("PulseSync");
				clients.add("ps");
			}
			if (ln.endsWith("user.js") || ln.endsWith(".js")) {
				tags.add("Web");
				clients.add("web");
			}
		}
	}

	if (tags.size === 0) {
		const lower = (name + " " + path).toLowerCase();
		if (lower.includes("pulse") || lower.includes("/ps")) {
			tags.add("PulseSync");
			clients.add("ps");
		}
		if (lower.includes("web")) {
			tags.add("Web");
			clients.add("web");
		}
		if (!clients.has("ps")) {
			tags.add("Next Music");
			clients.add("nm");
		}
	}

	const orderedTags: Tag[] = [];
	if (tags.has("Next Music")) orderedTags.push("Next Music");
	if (tags.has("PulseSync")) orderedTags.push("PulseSync");
	if (tags.has("Web")) orderedTags.push("Web");

	return { tags: orderedTags, clients: [...clients] };
}

export async function loadExtensions(
	onProgress?: (msg: string) => void,
	token?: string,
): Promise<Extension[]> {
	onProgress?.("Loading submodule map…");
	const gitmodules = await loadGitmodules();

	onProgress?.("Scanning sections…");

	const entries: {
		name: string;
		repoPath: string;
		owner: string;
		repo: string;
		folderPath: string;
		isTheme: boolean;
	}[] = [];

	for (const section of ["Addons", "Themes"]) {
		const isTheme = section === "Themes";
		const prefix = section + "/";
		const seen = new Set<string>();

		for (const [modPath, modUrl] of Object.entries(gitmodules)) {
			if (!modPath.startsWith(prefix)) continue;
			const name = modPath.slice(prefix.length);
			if (!name || name.includes("/")) continue;
			const parsed = extractGhOwnerRepo(modUrl);
			if (!parsed) continue;
			seen.add(name.toLowerCase());
			entries.push({
				name,
				repoPath: modPath,
				owner: parsed[0],
				repo: parsed[1],
				folderPath: "",
				isTheme,
			});
		}

		try {
			const items = await ghContents(OWNER, REPO, section, token);
			for (const item of items) {
				if (item.type !== "dir" || seen.has(item.name.toLowerCase())) continue;
				entries.push({
					name: item.name,
					repoPath: item.path,
					owner: OWNER,
					repo: REPO,
					folderPath: item.path,
					isTheme,
				});
			}
		} catch {}
	}

	onProgress?.(`Found ${entries.length} extensions, loading metadata…`);

	const results: Extension[] = [];
	let i = 0;

	async function worker() {
		while (i < entries.length) {
			const idx = i++;
			const entry = entries[idx];
			try {
				const [meta, releaseAssets] = await Promise.all([
					getFolderMeta(entry.owner, entry.repo, entry.folderPath, token),
					getAllReleaseAssets(entry.owner, entry.repo, token),
				]);
				const { tags, clients } = deriveTagsAndClients(
					releaseAssets,
					entry.name,
					entry.repoPath,
				);
				results.push({
					id: entry.repoPath.replace(/\//g, "-").toLowerCase(),
					name: entry.name,
					description: "",
					author: entry.owner !== OWNER ? entry.owner : "",
					tags,
					isTheme: entry.isTheme,
					logo: meta.logo ?? undefined,
					readmeUrl: meta.readmeUrl ?? undefined,
					readmeBaseUrl: meta.readmeBaseUrl ?? undefined,
					userJsUrl: meta.userJsUrl ?? undefined,
					repo: `https://github.com/${entry.owner}/${entry.repo}`,
					downloadZip: `https://github.com/${entry.owner}/${entry.repo}/archive/refs/heads/main.zip`,
					releaseAssets,
					clients,
				});
			} catch {}
		}
	}

	await Promise.all(
		Array.from({ length: Math.min(4, entries.length) }, worker),
	);
	return results.sort((a, b) => a.name.localeCompare(b.name));
}
