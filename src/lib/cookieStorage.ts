const MAX_ENCODED_CHUNK = 3000;
const MAX_CHUNKS = 32;
const MAX_AGE = 60 * 60 * 24 * 30;

function attributes(maxAge: number): string {
	return `; Path=/; Max-Age=${maxAge}; SameSite=Lax${typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : ""}`;
}

function readCookie(name: string): string | null {
	const prefix = `${encodeURIComponent(name)}=`;
	for (const part of document.cookie.split(/;\s*/)) {
		if (part.startsWith(prefix)) {
			try {
				return decodeURIComponent(part.slice(prefix.length));
			} catch {
				return null;
			}
		}
	}
	return null;
}

function writeCookie(name: string, value: string, maxAge = MAX_AGE) {
	document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}${attributes(maxAge)}`;
}

function clearChunks(key: string) {
	writeCookie(key, "", 0);
	for (let i = 0; i < MAX_CHUNKS; i++) writeCookie(`${key}.${i}`, "", 0);
}

export function splitCookieValue(value: string): string[] {
	const chunks: string[] = [];
	let chunk = "";
	let size = 0;
	for (const character of value) {
		const length = encodeURIComponent(character).length;
		if (size + length > MAX_ENCODED_CHUNK) {
			chunks.push(chunk);
			chunk = "";
			size = 0;
		}
		chunk += character;
		size += length;
	}
	chunks.push(chunk);
	if (chunks.length > MAX_CHUNKS)
		throw new Error("Session is too large to persist");
	return chunks;
}

export const cookieStorage = {
	getItem(key: string): string | null {
		if (typeof document === "undefined") return null;
		const base = readCookie(key);
		if (base === null || readCookie(`${key}.0`) === null) return base;
		if (!/^\d+$/.test(base)) return null;
		const count = Number(base);
		if (count < 1 || count > MAX_CHUNKS) return null;
		let value = "";
		for (let i = 0; i < count; i++) {
			const chunk = readCookie(`${key}.${i}`);
			if (chunk === null) return null;
			value += chunk;
		}
		return value;
	},
	setItem(key: string, value: string): void {
		if (typeof document === "undefined") return;
		const chunks = splitCookieValue(value);
		clearChunks(key);
		if (chunks.length === 1) return writeCookie(key, value);
		chunks.forEach((chunk, index) => writeCookie(`${key}.${index}`, chunk));
		writeCookie(key, String(chunks.length));
	},
	removeItem(key: string): void {
		if (typeof document !== "undefined") clearChunks(key);
	},
};
