import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
	annotateDrugLine,
	hasDrugWord,
	highlightDrugs,
} from "../src/lib/track/drugDetector";
import {
	isMetaCache,
	reportFailure,
	usableJson,
	yandexRequest,
} from "./runtime";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("annotation preserves detection and highlight semantics", () => {
	for (const text of [
		"кокаин",
		"кокаиновый",
		"кокаин и кокаиновый",
		"Кокаин, героин!",
		"hello world",
		"",
		"<script>кокаин</script>",
	]) {
		const annotation = annotateDrugLine(text);
		assert.equal(annotation.isDrug, hasDrugWord(text));
		assert.equal(annotation.parts.map((part) => part.text).join(""), text);
		if (annotation.isDrug) {
			const rendered = annotation.parts
				.map((part) =>
					part.marked
						? `<mark class="drugMark">${part.text}</mark>`
						: part.text,
				)
				.join("");
			if (!text.includes("<")) assert.equal(rendered, highlightDrugs(text));
		}
	}
});

test("annotation safely renders markup as text", () => {
	const parts = annotateDrugLine('<img src=x onerror="alert(1)"> кокаин').parts;
	const html = renderToStaticMarkup(
		createElement(
			"span",
			null,
			...parts.map((part, index) =>
				part.marked
					? createElement(
							"mark",
							{ key: index, className: "drugMark" },
							part.text,
						)
					: part.text,
			),
		),
	);
	assert.ok(!html.includes("<img"));
	assert.ok(html.includes("&lt;img"));
	assert.ok(html.includes('<mark class="drugMark">кокаин</mark>'));
});

test("cache failure policy requires validated usable metadata", () => {
	const directory = mkdtempSync(join(tmpdir(), "ddetector-test-"));
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
