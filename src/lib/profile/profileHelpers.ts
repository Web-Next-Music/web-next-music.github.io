import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import type { TrackLikeMeta } from "@/lib/supabase/likesContext";
import { decodeTrackKey } from "@/lib/track/trackKey";
import { findTrackById } from "@/lib/track/trackStore";
import { TRACK_META } from "@/lib/fckcensor";

marked.use({ breaks: true, gfm: true } as Parameters<typeof marked.use>[0]);

export function renderBio(text: string): string {
	const content = DOMPurify.sanitize(marked.parse(text, { async: false }), {
		ALLOWED_TAGS: [
			"p",
			"br",
			"strong",
			"b",
			"em",
			"i",
			"s",
			"sub",
			"sup",
			"kbd",
			"del",
			"a",
			"ul",
			"ol",
			"li",
			"blockquote",
			"pre",
			"code",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"hr",
			"img",
			"picture",
			"div",
			"span",
			"details",
			"summary",
			"table",
			"thead",
			"tbody",
			"tfoot",
			"tr",
			"th",
			"td",
			"caption",
		],
		ALLOWED_ATTR: [
			"href",
			"title",
			"src",
			"alt",
			"width",
			"height",
			"align",
			"colspan",
			"rowspan",
			"open",
			"start",
			"reversed",
		],
		RETURN_DOM: true,
		ALLOW_DATA_ATTR: false,
		ALLOW_ARIA_ATTR: false,
		ALLOWED_URI_REGEXP:
			/^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
	}) as HTMLElement;

	for (const element of content.querySelectorAll("a[href], img[src]")) {
		const attribute = element.tagName === "IMG" ? "src" : "href";
		const value = element.getAttribute(attribute)!;
		try {
			const url = new URL(value, "https://profile.invalid/");
			const protocols =
				attribute === "src"
					? ["https:", "http:"]
					: ["https:", "http:", "mailto:"];
			if (!protocols.includes(url.protocol)) element.removeAttribute(attribute);
		} catch {
			element.removeAttribute(attribute);
		}
	}

	for (const image of content.querySelectorAll("img")) {
		image.setAttribute("loading", "lazy");
		image.setAttribute("decoding", "async");
		image.setAttribute("referrerpolicy", "no-referrer");
	}

	return content.innerHTML;
}

export function formatJoinDate(iso: string, exact: boolean): string {
	const d = new Date(iso);
	if (exact) {
		const dd = String(d.getDate()).padStart(2, "0");
		const mm = String(d.getMonth() + 1).padStart(2, "0");
		const yyyy = d.getFullYear();
		return `${mm}/${dd}/${yyyy}`;
	}
	return `Joined ${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
}

export function resolveTrackMeta(
	trackId: string,
	likedMeta?: Map<string, TrackLikeMeta>,
) {
	const meta = TRACK_META[trackId];
	if (meta) return meta;
	const stored = findTrackById(trackId);
	if (stored)
		return { title: stored.title, artist: stored.artist, cover: stored.cover };
	const db = likedMeta?.get(trackId);
	if (db?.title || db?.artist || db?.cover)
		return { title: db.title, artist: db.artist, cover: db.cover };
	// Stable keys encode title/artist/cover inside them - decode as last resort
	if (!trackId.startsWith("http")) {
		const decoded = decodeTrackKey(trackId);
		if (decoded?.title || decoded?.artist)
			return {
				title: decoded.title,
				artist: decoded.artist,
				cover: decoded.cover,
			};
	}
	return null;
}
