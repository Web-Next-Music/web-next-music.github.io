export interface LaSettingsView {
	name: string;
	description: string;
	serverCoverUrl: string;
	minClientVersion: string;
	maxClientVersion: string;
	devMode: boolean;
	port: number;
	noTLS: boolean;
	cert: string;
	key: string;
	adminGithubUserIds: number[];
}

export type LaSettingsPatch = Partial<
	Omit<LaSettingsView, "adminGithubUserIds">
>;

export interface LaPublicInfo {
	name: string;
	description: string;
	cover: string;
	version: string;
}

export type LaScheme = "https" | "http";

export interface LaResult<T> {
	data: T;
	scheme: LaScheme;
}

async function fetchJson<T>(
	url: string,
	init?: RequestInit,
): Promise<T | null> {
	try {
		const res = await fetch(url, init);
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

async function withSchemeFallback<T>(
	server: string,
	port: string | number,
	path: string,
	init: RequestInit | undefined,
	preferred?: LaScheme,
): Promise<LaResult<T> | null> {
	const order: LaScheme[] = preferred
		? [preferred, preferred === "https" ? "http" : "https"]
		: ["https", "http"];

	for (const scheme of order) {
		const data = await fetchJson<T>(
			`${scheme}://${server}:${port}${path}`,
			init,
		);
		if (data) return { data, scheme };
	}
	return null;
}

export function fetchLaPublicInfo(
	server: string,
	port: string | number,
	preferred?: LaScheme,
): Promise<LaResult<LaPublicInfo> | null> {
	return withSchemeFallback<LaPublicInfo>(
		server,
		port,
		"/api/info",
		undefined,
		preferred,
	);
}

export function fetchLaSettings(
	server: string,
	port: string | number,
	token: string,
	preferred?: LaScheme,
): Promise<LaResult<LaSettingsView> | null> {
	return withSchemeFallback<LaSettingsView>(
		server,
		port,
		"/api/admin/settings",
		{ headers: { Authorization: `Bearer ${token}` } },
		preferred,
	);
}

export function updateLaSettings(
	server: string,
	port: string | number,
	token: string,
	patch: LaSettingsPatch,
	preferred?: LaScheme,
): Promise<LaResult<LaSettingsView> | null> {
	return withSchemeFallback<LaSettingsView>(
		server,
		port,
		"/api/admin/settings",
		{
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(patch),
		},
		preferred,
	);
}
