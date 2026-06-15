const MAX_CHUNK = 3000;
const MAX_AGE = 60 * 60 * 24 * 365;

function cookieAttrs(): string {
	const secure =
		typeof location !== "undefined" && location.protocol === "https:"
			? "; Secure"
			: "";
	return `; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`;
}

function readCookie(name: string): string | null {
	const prefix = `${encodeURIComponent(name)}=`;
	for (const part of document.cookie.split("; ")) {
		if (part.startsWith(prefix)) {
			return decodeURIComponent(part.slice(prefix.length));
		}
	}
	return null;
}

function writeCookie(name: string, value: string) {
	document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}${cookieAttrs()}`;
}

function deleteCookie(name: string) {
	const secure =
		typeof location !== "undefined" && location.protocol === "https:"
			? "; Secure"
			: "";
	document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

function clearChunks(key: string) {
	deleteCookie(key);
	for (let i = 0; ; i++) {
		const name = `${key}.${i}`;
		if (readCookie(name) === null) break;
		deleteCookie(name);
	}
}

export const cookieStorage = {
	getItem(key: string): string | null {
		if (typeof document === "undefined") return null;

		const base = readCookie(key);
		if (base === null) return null;

		if (readCookie(`${key}.0`) === null) return base;

		const count = Number.parseInt(base, 10);
		if (!Number.isFinite(count)) return base;

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

		clearChunks(key);

		if (value.length <= MAX_CHUNK) {
			writeCookie(key, value);
			return;
		}

		const chunks: string[] = [];
		for (let i = 0; i < value.length; i += MAX_CHUNK) {
			chunks.push(value.slice(i, i + MAX_CHUNK));
		}
		writeCookie(key, String(chunks.length));
		chunks.forEach((chunk, i) => writeCookie(`${key}.${i}`, chunk));
	},

	removeItem(key: string): void {
		if (typeof document === "undefined") return;
		clearChunks(key);
	},
};
