import { writeFile, mkdir } from "fs/promises";
import { readFileSync, existsSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const exec = promisify(execFile);
const __dir = dirname(fileURLToPath(import.meta.url));

// .env
const envPath = join(__dir, "../.env");
if (existsSync(envPath)) {
	const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		const val = trimmed.slice(eqIdx + 1).trim();
		if (key && !(key in process.env)) process.env[key] = val;
	}
}

// Config
const TOKEN = process.env.YANDEX_TOKEN ?? "";
const OUTPUT_PATH = join(__dir, "../src/data/experiments.json");

if (!TOKEN) {
	console.error("[ERROR] YANDEX_TOKEN is not set.");
	console.error("        Add to .env:  YANDEX_TOKEN=y0_...");
	process.exit(1);
}

// Logging helpers
const ok = (m: string) => console.log(`\x1b[32m✓\x1b[0m ${m}`);
const info = (m: string) => console.log(`\x1b[36mℹ\x1b[0m ${m}`);

// HTTP via curl (Yandex blocks Node's TLS fingerprint)
async function curlGet(url: string): Promise<string> {
	const { stdout } = await exec(
		"curl",
		[
			"--silent",
			"--compressed",
			"--max-time",
			"30",
			"-H",
			`Authorization: OAuth ${TOKEN}`,
			"-A",
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
			url,
		],
		{ maxBuffer: 50 * 1024 * 1024 },
	);
	return stdout;
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
	if (!result || typeof result !== "object") {
		throw new Error('"result" missing or not an object in API response');
	}

	const experiments = Object.keys(result).sort((a, b) => a.localeCompare(b));
	ok(`${experiments.length} experiments`);

	const output: ExperimentsFile = {
		fetchedAt: new Date().toISOString(),
		experiments,
	};

	await mkdir(dirname(OUTPUT_PATH), { recursive: true });
	await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");

	console.log("");
	ok(`src/data/experiments.json saved (${experiments.length} experiments)`);
	console.log("");
}

main().catch((e: Error) => {
	console.error("\x1b[31m[ERROR]\x1b[0m", e.message);
	process.exit(1);
});
