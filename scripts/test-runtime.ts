import assert from "node:assert/strict";
import { test } from "node:test";
import {
	isMetaCache,
	reportFailure,
	usableJson,
	yandexRequest,
} from "./runtime";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("cache failure policy requires validated usable metadata", () => {
	const directory = mkdtempSync(join(tmpdir(), "runtime-test-"));
	const path = join(directory, "cache.json");
	const previousCode = process.exitCode;
	try {
		assert.equal(isMetaCache({}), false);
		assert.equal(isMetaCache({ "1": null }), false);
		assert.equal(
			isMetaCache({ "1": { title: "song", artist: "artist" }, "2": 42 }),
			false,
		);
		writeFileSync(
			path,
			JSON.stringify({ "1": { title: "song", artist: "artist" }, "2": null }),
		);
		assert.equal(usableJson(path, isMetaCache), true);
		reportFailure(path, isMetaCache);
		assert.equal(process.exitCode, previousCode);
		writeFileSync(path, "broken");
		reportFailure(path, isMetaCache);
		assert.equal(process.exitCode, 1);
	} finally {
		process.exitCode = previousCode;
		rmSync(directory, { recursive: true, force: true });
	}
});

test("missing token fails without logging secrets or starting curl", () => {
	assert.throws(
		() => yandexRequest("https://example.invalid", ""),
		/YANDEX_TOKEN is not set/,
	);
});
