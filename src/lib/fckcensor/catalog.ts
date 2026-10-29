import type { LegacyTrack, TrackMeta } from "@/types/track";

export interface CatalogEntry {
	id: string;
	title: string;
	artist?: string;
	cover?: string;
	yandexUrl: string;
	trackIds: string[];
}

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as RecordValue)
		: {};
const entries = (value: unknown) => Object.entries(record(value));
const idOf = (value: unknown): string => {
	const id = typeof value === "object" ? record(value).id : value;
	return typeof id === "string" || typeof id === "number" ? String(id) : "";
};
const names = (value: unknown): string =>
	Array.isArray(value)
		? value
				.map((artist) => record(artist).name)
				.filter((name) => typeof name === "string")
				.join(", ")
		: "";
const cover = (value: unknown): string | undefined => {
	if (typeof value !== "string" || !value) return undefined;
	const url = value.replace("%%", "400x400");
	return url.startsWith("https://") ? url : `https://${url}`;
};

export function parseCatalog(
	data: unknown,
	metadata: Record<string, TrackMeta | null> = {},
) {
	const sources = record(data).sources;
	if (!Array.isArray(sources) || !sources.length)
		throw new Error("Invalid v2 list: missing sources");
	const patches = new Map<string, RecordValue>();
	const tracks = new Map<string, LegacyTrack>();
	const albums = new Map<string, CatalogEntry>();
	const artists = new Map<string, CatalogEntry>();
	for (const source of sources) {
		for (const [id, patch] of entries(record(source).tracks)) {
			patches.set(id, { ...patches.get(id), ...record(patch) });
		}
	}
	for (const source of sources) {
		const current = record(source);
		if (Array.isArray(current.tracksStorages)) {
			for (const storage of current.tracksStorages) {
				const item = record(storage);
				if (typeof item.urlTemplate !== "string")
					throw new Error("Invalid v2 storage URL");
				const template = item.urlTemplate.startsWith("https://")
					? item.urlTemplate
					: `https://${item.urlTemplate}`;
				const add = (id: string, fileId: string) => {
					if (!id || !fileId) throw new Error("Invalid v2 track ID");
					const url = template.replace("%%", encodeURIComponent(fileId));
					if (new URL(url).protocol !== "https:")
						throw new Error("Invalid v2 track URL");
					const patch = patches.get(id) ?? {};
					const cached = metadata[id];
					tracks.set(id, {
						id,
						url,
						yandexUrl: `https://music.yandex.ru/track/${id}`,
						meta: {
							title:
								typeof patch.title === "string"
									? patch.title
									: (cached?.title ?? `Track #${id}`),
							artist: names(patch.artists) || cached?.artist || "",
							cover: cover(patch.coverUri) ?? cached?.cover,
						},
					});
				};
				if (Array.isArray(item.trackIds))
					for (const track of item.trackIds) add(idOf(track), idOf(track));
				for (const [id, target] of entries(item.tracks)) add(id, idOf(target));
			}
		}
		for (const [id, value] of entries(current.albums)) {
			const album = record(value);
			const volumes = Array.isArray(album.volumes) ? album.volumes : [];
			albums.set(id, {
				id,
				title: typeof album.title === "string" ? album.title : `Album #${id}`,
				artist: names(album.artists),
				cover: cover(album.coverUri),
				yandexUrl: `https://music.yandex.ru/album/${id}`,
				trackIds: volumes.flatMap((volume) =>
					Array.isArray(volume) ? volume.map(idOf).filter(Boolean) : [],
				),
			});
		}
		for (const [id, value] of entries(current.artistsInsertions)) {
			const insertion = record(value);
			const ids = Array.isArray(insertion.tracks)
				? insertion.tracks
						.map((track) => idOf(record(track).releaseId))
						.filter(Boolean)
				: [];
			let title = `Artist #${id}`;
			for (const patch of [
				...patches.values(),
				...sources.flatMap((source) =>
					entries(record(source).albums).map(([, album]) => record(album)),
				),
			]) {
				if (!Array.isArray(patch.artists)) continue;
				const artist = patch.artists.find((artist) => idOf(artist) === id);
				if (typeof record(artist).name === "string") {
					title = record(artist).name as string;
					break;
				}
			}
			artists.set(id, {
				id,
				title,
				yandexUrl: `https://music.yandex.ru/artist/${id}`,
				trackIds: ids,
			});
		}
	}
	if (!tracks.size) throw new Error("Invalid v2 list: no playable tracks");
	return {
		legacy: [...tracks.values()],
		albums: [...albums.values()],
		artists: [...artists.values()],
	};
}
