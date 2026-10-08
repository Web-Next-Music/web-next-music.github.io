import { join } from "path";
import { root, yandexRequest, reportFailure, writeJson } from "./runtime";
const __dir = join(root, "scripts");

// Config
const TOKEN = process.env.YANDEX_TOKEN ?? "";
const OUTPUT_PATH = join(__dir, "../src/data/experiments.json");

// Logging helpers
const ok = (m: string) => console.log(`\x1b[32m✓\x1b[0m ${m}`);
const info = (m: string) => console.log(`\x1b[36mℹ\x1b[0m ${m}`);

// HTTP via curl (Yandex blocks Node's TLS fingerprint)
async function curlGet(url: string): Promise<string> {
	return yandexRequest(url, TOKEN);
}

export interface ExperimentsFile {
	fetchedAt: string;
	experiments: string[];
}

async function main(): Promise<void> {
	console.log("\n\x1b[1mYandex Music - experiments export\x1b[0m\n");

	info("Fetching experiments from API...");
	const raw = await curlGet("https://api.music.yandex.net/account/experiments");

	let parsed: { result?: Record<string, unknown> };
	try {
		parsed = JSON.parse(raw) as typeof parsed;
	} catch {
		throw new Error("Invalid JSON response from API");
	}

	const result = parsed.result;
	if (!result || typeof result !== "object" || Array.isArray(result)) {
		throw new Error('"result" missing or not an object in API response');
	}

	const experiments = Object.keys(result).sort((a, b) => a.localeCompare(b));
	ok(`${experiments.length} experiments`);

	const output: ExperimentsFile = {
		fetchedAt: new Date().toISOString(),
		experiments,
	};

	writeJson(OUTPUT_PATH, output);

	console.log("");
	ok(`src/data/experiments.json saved (${experiments.length} experiments)`);
	console.log("");
}

main().catch(() =>
	reportFailure(OUTPUT_PATH, (value) => {
		if (!value || typeof value !== "object") return false;
		const data = value as Partial<ExperimentsFile>;
		return (
			typeof data.fetchedAt === "string" &&
			Number.isFinite(Date.parse(data.fetchedAt)) &&
			Array.isArray(data.experiments) &&
			data.experiments.every((item) => typeof item === "string")
		);
	}),
);
