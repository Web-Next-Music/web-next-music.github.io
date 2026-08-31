export type ClassValue = string | number | bigint | boolean | null | undefined;

export function cx(...parts: ClassValue[]): string {
	return parts.filter((p) => typeof p === "string" && p.length > 0).join(" ");
}
