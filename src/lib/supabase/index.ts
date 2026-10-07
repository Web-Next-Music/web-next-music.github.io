import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config";
import { cookieStorage } from "../cookieStorage";
import type { Database } from "@/types/database.types";

let _client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> | null {
	if (!config.supabase.url || !config.supabase.anonKey) return null;
	if (!_client)
		_client = createClient<Database>(
			config.supabase.url,
			config.supabase.anonKey,
			{
				auth: {
					storage: cookieStorage,
					persistSession: true,
					autoRefreshToken: true,
					detectSessionInUrl:
						typeof window !== "undefined" &&
						!/^\/auth-link\/?$/.test(window.location.pathname),
				},
			},
		);
	return _client;
}
