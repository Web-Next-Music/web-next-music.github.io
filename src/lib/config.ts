export const config = {
	supabase: {
		url: process.env.NEXT_PUBLIC_SUPABASE_URL,
		anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANONKEY,
	},
	github: {
		extensions: {
			owner: "Web-Next-Music",
			repo: "Next-Music-Extensions",
		},
		client: {
			fullName: "Web-Next-Music/Next-Music-Client",
			url: "https://github.com/Web-Next-Music/Next-Music-Client",
		},
	},
} as const;
