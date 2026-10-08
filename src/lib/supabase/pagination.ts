export async function collectPages<T>(
	fetchPage: (
		offset: number,
		limit: number,
	) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
	pageSize = 500,
): Promise<T[]> {
	const rows: T[] = [];
	for (let offset = 0; ; offset += pageSize) {
		const { data, error } = await fetchPage(offset, pageSize);
		if (error) throw new Error(error.message);
		if (!data) throw new Error("The collection could not be loaded");
		rows.push(...data);
		if (data.length < pageSize) return rows;
	}
}
