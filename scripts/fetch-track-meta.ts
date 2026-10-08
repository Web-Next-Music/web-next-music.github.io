import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
	root,
	yandexRequest,
	reportFailure,
	isMetaCache,
	writeJson,
} from "./runtime";
const __dir = join(root, "scripts");

// Config
const LEGACY_URL =
	"https://raw.githubusercontent.com/Hazzz895/FckCensorData/refs/heads/main/list.json";

const YANDEX_API = "https://api.music.yandex.net/tracks";
const YANDEX_TOKEN = process.env.YANDEX_TOKEN ?? "";

const OUTPUT_PATH = join(__dir, "../src/data/track-meta.json");

const BATCH_SIZE = 50;
const DELAY_MS = 350;

// Types
export interface TrackMeta {
	title: string;
	artist: string;
	cover?: string;
}

type MetaMap = Record<string, TrackMeta | null>;

interface YandexTrack {
	id: number | string;
	title?: string;
	artists?: Array<{ name: string }>;
	albums?: Array<{ coverUri?: string; ogImage?: string }>;
	coverUri?: string;
	ogImage?: string;
	error?: string;
}

// Utils
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function coverUrl(raw?: string): string | undefined {
	if (!raw) return undefined;
	return "https://" + raw.replace("%%", "400x400");
}

function loadExisting(): MetaMap {
	if (!existsSync(OUTPUT_PATH)) return {};
	try {
		const value: unknown = JSON.parse(readFileSync(OUTPUT_PATH, "utf8"));
		return isMetaCache(value) ? (value as MetaMap) : {};
	} catch {
		console.warn("[WARN] Failed to read existing file - starting fresh");
		return {};
	}
}

function save(meta: MetaMap) {
	writeJson(OUTPUT_PATH, meta);
}

// Using curl instead of Node fetch - Yandex blocks Node by TLS fingerprint
function fetchBatch(ids: string[]): MetaMap {
	const output = yandexRequest(YANDEX_API, YANDEX_TOKEN, [
		"-X",
		"POST",
		"-H",
		"Content-Type: application/x-www-form-urlencoded",
		"--data-urlencode",
		`track-ids=${ids.join(",")}`,
	]);

	const data = JSON.parse(output) as { result?: YandexTrack[] };
	if (!Array.isArray(data.result)) throw new Error("Invalid tracks response");
	const tracks = data.result;

	const result: MetaMap = {};
	for (const t of tracks) {
		if (!t.id || t.error) continue;
		const rawCover =
			t.coverUri ??
			t.ogImage ??
			t.albums?.[0]?.coverUri ??
			t.albums?.[0]?.ogImage;

		result[String(t.id)] = {
			title: t.title?.trim() || `Track #${t.id}`,
			artist: t.artists?.map((a) => a.name).join(", ") ?? "",
			cover: coverUrl(rawCover),
		};
	}
	return result;
}

// Main flow
async function main() {
	// 1. Download legacy list
	console.log("[DOWNLOAD] Loading legacy JSON...");
	const legacyResp = await fetch(LEGACY_URL, {
		signal: AbortSignal.timeout(30000),
	});
	if (!legacyResp.ok)
		throw new Error(`Failed to load legacy JSON: ${legacyResp.status}`);

	const legacyData = (await legacyResp.json()) as {
		tracks: Record<string, string>;
	};
	if (
		!legacyData.tracks ||
		typeof legacyData.tracks !== "object" ||
		Array.isArray(legacyData.tracks)
	)
		throw new Error("Invalid legacy list");
	const allIds = Object.keys(legacyData.tracks);
	console.log(`   Tracks in list: ${allIds.length}`);

	// 2. Load existing metadata
	const existing = loadExisting();
	const existingCount = Object.keys(existing).length;
	if (existingCount > 0) {
		console.log(`[FILE] Already saved: ${existingCount} entries`);
	}

	// 3. Only new + previously null
	const toFetch = allIds.filter(
		(id) => !(id in existing) || existing[id] === null,
	);

	if (toFetch.length === 0) {
		console.log("[OK] All tracks already known, no update needed.");
		return;
	}

	console.log(`[PROCESS] Need to fetch: ${toFetch.length} tracks`);

	// 4. Batch requests via curl
	const meta: MetaMap = { ...existing };
	let processed = 0;
	let failed = 0;
	const batches = Math.ceil(toFetch.length / BATCH_SIZE);
	const batchesWidth = String(batches).length;

	console.log(
		`[MUSIC] Fetching in batches of ${BATCH_SIZE} (total batches: ${batches})...\n`,
	);

	for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
		const batch = toFetch.slice(i, i + BATCH_SIZE);
		const batchNum = Math.floor(i / BATCH_SIZE) + 1;

		try {
			const batchMeta = fetchBatch(batch);

			for (const id of batch) {
				meta[id] = batchMeta[id] ?? null;
			}

			processed += batch.length;
			const percent = Math.round((processed / toFetch.length) * 100);
			const found = Object.keys(batchMeta).length;
			console.log(
				`   [${String(batchNum).padStart(batchesWidth)}/${batches}]` +
					` received ${String(found).padStart(2)}/${batch.length}` +
					`  (${percent}%)`,
			);
		} catch {
			failed += batch.length;
			processed += batch.length;
			console.error(`   [ERROR] Batch ${batchNum} failed`);
		}

		if (i + BATCH_SIZE < toFetch.length) {
			await sleep(DELAY_MS);
		}
	}

	if (failed > 0) throw new Error("Incomplete metadata refresh");

	// 5. Save
	console.log(`\n[SAVE] Writing → ${OUTPUT_PATH}`);
	save(meta);

	const withMeta = Object.values(meta).filter(Boolean).length;
	const total = Object.keys(meta).length;
	console.log(`\n[OK] Done!`);
	console.log(`   Total entries           : ${total}`);
	console.log(`   With metadata           : ${withMeta}`);
	console.log(`   Without metadata (null) : ${total - withMeta}`);
	if (failed > 0) console.warn(`   Failed batches         : ${failed} tracks`);
}

main().catch(() => reportFailure(OUTPUT_PATH, isMetaCache));
