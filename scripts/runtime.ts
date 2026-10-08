import { loadEnvConfig } from "@next/env";
import { execFileSync } from "node:child_process";
import {
	readFileSync,
	writeFileSync,
	mkdirSync,
	renameSync,
	rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvConfig(root);
export function yandexRequest(
	url: string,
	token: string,
	args: string[] = [],
): string {
	if (!token) throw new Error("YANDEX_TOKEN is not set");
	try {
		return execFileSync(
			"curl",
			[
				"--silent",
				"--show-error",
				"--fail",
				"--compressed",
				"--max-time",
				"30",
				"-H",
				`Authorization: OAuth ${token}`,
				...args,
				url,
			],
			{
				encoding: "utf8",
				timeout: 35000,
				maxBuffer: 50 * 1024 * 1024,
				stdio: ["ignore", "pipe", "pipe"],
			},
		);
	} catch {
		throw new Error("Yandex request failed (HTTP, network or timeout)");
	}
}
export function writeJson(path: string, value: unknown) {
	mkdirSync(dirname(path), { recursive: true });
	const temporary = `${path}.${process.pid}.tmp`;
	try {
		writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", "utf8");
		renameSync(temporary, path);
	} finally {
		rmSync(temporary, { force: true });
	}
}
export function isMetaCache(value: unknown): boolean {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const entries = Object.values(value);
	return (
		entries.some((entry) => entry !== null) &&
		entries.every(
			(entry) =>
				entry === null ||
				(typeof entry === "object" &&
					typeof entry.title === "string" &&
					typeof entry.artist === "string" &&
					(entry.cover === undefined || typeof entry.cover === "string")),
		)
	);
}
export function usableJson(
	path: string,
	validate: (data: unknown) => boolean,
): boolean {
	try {
		return validate(JSON.parse(readFileSync(path, "utf8")));
	} catch {
		return false;
	}
}
export function reportFailure(
	path: string,
	validate: (data: unknown) => boolean,
) {
	if (usableJson(path, validate)) {
		console.warn("[WARN] Refresh failed; preserving usable cached data");
	} else {
		console.error("[ERROR] Refresh failed and no usable cached data exists");
		process.exitCode = 1;
	}
}
