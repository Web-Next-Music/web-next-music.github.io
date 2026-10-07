export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	__InternalSupabase: {
		PostgrestVersion: "14.5";
	};
	public: {
		Tables: {
			account_likes: {
				Row: {
					created_at: string | null;
					github_login: string;
					id: string;
					user_id: string;
				};
				Insert: {
					created_at?: string | null;
					github_login: string;
					id?: string;
					user_id: string;
				};
				Update: {
					created_at?: string | null;
					github_login?: string;
					id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "account_likes_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "user_profiles";
						referencedColumns: ["user_id"];
					},
				];
			};
			bans: {
				Row: {
					github_id: string | null;
					user_id: string;
				};
				Insert: {
					github_id?: string | null;
					user_id: string;
				};
				Update: {
					github_id?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			ddetector_ignored_tracks: {
				Row: {
					ignored_at: string | null;
					track_id: number;
					user_id: string;
				};
				Insert: {
					ignored_at?: string | null;
					track_id: number;
					user_id?: string;
				};
				Update: {
					ignored_at?: string | null;
					track_id?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "ddetector_ignored_tracks_track_id_fkey";
						columns: ["track_id"];
						isOneToOne: false;
						referencedRelation: "ddetector_tracks";
						referencedColumns: ["id"];
					},
				];
			};
			ddetector_lyrics_cache: {
				Row: {
					fetched_at: string | null;
					lyrics: Json | null;
					retry_after: string | null;
					status: string;
					track_id: number;
				};
				Insert: {
					fetched_at?: string | null;
					lyrics?: Json | null;
					retry_after?: string | null;
					status?: string;
					track_id: number;
				};
				Update: {
					fetched_at?: string | null;
					lyrics?: Json | null;
					retry_after?: string | null;
					status?: string;
					track_id?: number;
				};
				Relationships: [
					{
						foreignKeyName: "ddetector_lyrics_cache_track_id_fkey";
						columns: ["track_id"];
						isOneToOne: true;
						referencedRelation: "ddetector_tracks";
						referencedColumns: ["id"];
					},
				];
			};
			ddetector_tracks: {
				Row: {
					added_at: string | null;
					artist: string;
					cover: string | null;
					id: number;
					title: string;
				};
				Insert: {
					added_at?: string | null;
					artist?: string;
					cover?: string | null;
					id: number;
					title?: string;
				};
				Update: {
					added_at?: string | null;
					artist?: string;
					cover?: string | null;
					id?: number;
					title?: string;
				};
				Relationships: [];
			};
			ddetector_users: {
				Row: {
					created_at: string | null;
					user_id: string;
				};
				Insert: {
					created_at?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			github_stargazers_cache: {
				Row: {
					count: number;
					data: Json;
					repo: string;
					updated_at: string;
				};
				Insert: {
					count?: number;
					data: Json;
					repo: string;
					updated_at?: string;
				};
				Update: {
					count?: number;
					data?: Json;
					repo?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			pinned_playlists: {
				Row: {
					playlist_id: string;
					position: number;
					user_id: string;
				};
				Insert: {
					playlist_id: string;
					position?: number;
					user_id: string;
				};
				Update: {
					playlist_id?: string;
					position?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "pinned_playlists_playlist_id_fkey";
						columns: ["playlist_id"];
						isOneToOne: false;
						referencedRelation: "playlists";
						referencedColumns: ["id"];
					},
				];
			};
			playlist_tracks: {
				Row: {
					added_at: string;
					id: string;
					playlist_id: string;
					position: number;
					track_id: string;
				};
				Insert: {
					added_at?: string;
					id?: string;
					playlist_id: string;
					position?: number;
					track_id: string;
				};
				Update: {
					added_at?: string;
					id?: string;
					playlist_id?: string;
					position?: number;
					track_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "playlist_tracks_playlist_id_fkey";
						columns: ["playlist_id"];
						isOneToOne: false;
						referencedRelation: "playlists";
						referencedColumns: ["id"];
					},
				];
			};
			playlists: {
				Row: {
					created_at: string;
					id: string;
					name: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					name: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					name?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "playlists_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "user_profiles";
						referencedColumns: ["user_id"];
					},
				];
			};
			profile_visibility_settings: {
				Row: {
					public_liked_tracks: boolean;
					public_playlists: boolean;
					show_account_links: boolean;
					user_id: string;
				};
				Insert: {
					public_liked_tracks?: boolean;
					public_playlists?: boolean;
					show_account_links?: boolean;
					user_id: string;
				};
				Update: {
					public_liked_tracks?: boolean;
					public_playlists?: boolean;
					show_account_links?: boolean;
					user_id?: string;
				};
				Relationships: [];
			};
			track_likes: {
				Row: {
					artist: string | null;
					cover: string | null;
					created_at: string;
					id: string;
					mp3_url: string | null;
					provider: string | null;
					provider_track_id: string | null;
					title: string | null;
					track_id: string;
					user_id: string;
				};
				Insert: {
					artist?: string | null;
					cover?: string | null;
					created_at?: string;
					id?: string;
					mp3_url?: string | null;
					provider?: string | null;
					provider_track_id?: string | null;
					title?: string | null;
					track_id: string;
					user_id: string;
				};
				Update: {
					artist?: string | null;
					cover?: string | null;
					created_at?: string;
					id?: string;
					mp3_url?: string | null;
					provider?: string | null;
					provider_track_id?: string | null;
					title?: string | null;
					track_id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "track_likes_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "user_profiles";
						referencedColumns: ["user_id"];
					},
				];
			};
			user_profiles: {
				Row: {
					avatar_url: string | null;
					background: string;
					bio: string | null;
					display_name: string | null;
					github_id: string | null;
					github_login: string | null;
					github_starred: boolean;
					status: string | null;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					avatar_url?: string | null;
					background?: string;
					bio?: string | null;
					display_name?: string | null;
					github_id?: string | null;
					github_login?: string | null;
					github_starred?: boolean;
					status?: string | null;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					avatar_url?: string | null;
					background?: string;
					bio?: string | null;
					display_name?: string | null;
					github_id?: string | null;
					github_login?: string | null;
					github_starred?: boolean;
					status?: string | null;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			apply_ddetector_snapshot: {
				Args: { p_job_id: string; p_lease: string; p_tracks: Json };
				Returns: undefined;
			};
			claim_ddetector_job: {
				Args: { p_job_id?: string; p_user_id: string };
				Returns: Json;
			};
			complete_ddetector_task: {
				Args: {
					p_error?: boolean;
					p_job_id: string;
					p_kind: string;
					p_lease: string;
					p_result: Json;
					p_track_id: number;
				};
				Returns: undefined;
			};
			get_ddetector_job: { Args: { p_job_id: string }; Returns: Json };
			get_ddetector_job_tasks: {
				Args: { p_job_id: string; p_lease: string };
				Returns: {
					artist: string;
					attempts: number;
					kind: string;
					title: string;
					track_id: number;
				}[];
			};
			get_public_account_links: {
				Args: { p_user_id: string };
				Returns: {
					identityId: string;
					label: string;
					provider: string;
					url: string;
				}[];
			};
			get_public_account_links_v2: {
				Args: { p_user_id: string };
				Returns: {
					label: string;
					provider: string;
					url: string;
				}[];
			};
			get_public_liked_tracks: {
				Args: { p_user_id: string };
				Returns: {
					artist: string;
					cover: string;
					mp3_url: string;
					title: string;
					track_id: string;
				}[];
			};
			get_public_liked_tracks_page: {
				Args: {
					p_after?: string;
					p_after_id?: string;
					p_limit?: number;
					p_user_id: string;
				};
				Returns: {
					artist: string;
					cover: string;
					created_at: string;
					id: string;
					mp3_url: string;
					title: string;
					track_id: string;
				}[];
			};
			get_user_stats: { Args: { p_user_id: string }; Returns: Json };
			release_ddetector_job: {
				Args: { p_error?: string; p_job_id: string; p_lease: string };
				Returns: Json;
			};
			resolve_public_profile: {
				Args: { p_github_id: string };
				Returns: {
					avatar_url: string;
					background: string;
					bio: string;
					created_at: string;
					display_name: string;
					github_id: string;
					github_login: string;
					github_starred: boolean;
					is_banned: boolean;
					status: string;
					user_id: string;
				}[];
			};
			resolve_public_profile_by_user_id: {
				Args: { p_user_id: string };
				Returns: {
					avatar_url: string;
					background: string;
					bio: string;
					created_at: string;
					display_name: string;
					github_id: string;
					github_login: string;
					github_starred: boolean;
					is_banned: boolean;
					status: string;
					user_id: string;
				}[];
			};
			revoke_other_transfer_sessions: {
				Args: { p_session_id: string; p_user_id: string };
				Returns: undefined;
			};
			sync_auth_profile_for_user: {
				Args: { p_user_id: string };
				Returns: undefined;
			};
			sync_own_auth_profile: { Args: never; Returns: undefined };
			transfer_verified_auth_identity: {
				Args: {
					p_provider: string;
					p_provider_id: string;
					p_source_user_id: string;
					p_target_user_id: string;
				};
				Returns: undefined;
			};
			transfer_verified_auth_identity_v2: {
				Args: {
					p_provider: string;
					p_provider_id: string;
					p_source_user_id: string;
					p_target_session_id: string;
					p_target_user_id: string;
				};
				Returns: undefined;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
	keyof Database,
	"public"
>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
	EnumName extends (DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never) = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {},
	},
} as const;
