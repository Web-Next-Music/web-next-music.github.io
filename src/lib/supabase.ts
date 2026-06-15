import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config";
import { cookieStorage } from "./cookieStorage";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
	if (!config.supabase.url || !config.supabase.anonKey) return null;
	if (!_client)
		_client = createClient(config.supabase.url, config.supabase.anonKey, {
			auth: {
				storage: cookieStorage,
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: true,
			},
		});
	return _client;
}
