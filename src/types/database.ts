export type UserRole = "ADMIN" | "PARTICIPANT";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  participant_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Participant = {
  id: string;
  name: string;
  display_name: string;
  email: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  name: string;
  name_en: string;
  code: string;
  flag_url: string | null;
  aliases: string[];
  created_at: string;
  updated_at: string;
};

export type Match = {
  id: string;
  match_date: string;
  match_time: string | null;
  kickoff_utc: string | null;
  group_name: string | null;
  round: string | null;
  team_a_id: string;
  team_b_id: string;
  stadium: string | null;
  city: string | null;
  host_country: string | null;
  official_score_a: number | null;
  official_score_b: number | null;
  status: "PENDING" | "FINISHED" | "CANCELLED";
  display_order: number;
  source_match_number: number | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Config = {
  key: string;
  value: unknown;
  updated_at: string;
};

export type Upload = {
  id: string;
  participant_id: string;
  uploaded_by_user_id: string;
  file_name: string;
  file_type: "PDF" | "XLS" | "XLSX";
  storage_path: string;
  file_url: string | null;
  status: "UPLOADED" | "PARSED" | "NEEDS_REVIEW" | "DRAFT" | "CONFIRMED" | "DISCARDED" | "ERROR";
  raw_extracted_text: string | null;
  parse_result_json: unknown | null;
  error_message: string | null;
  uploaded_at: string;
  confirmed_at: string | null;
  confirmed_by_user_id: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "email">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      participants: {
        Row: Participant;
        Insert: Partial<Participant> & Pick<Participant, "name" | "display_name">;
        Update: Partial<Participant>;
        Relationships: [];
      };
      teams: {
        Row: Team;
        Insert: Partial<Team> & Pick<Team, "name" | "name_en" | "code">;
        Update: Partial<Team>;
        Relationships: [];
      };
      matches: {
        Row: Match;
        Insert: Partial<Match> &
          Pick<Match, "match_date" | "team_a_id" | "team_b_id" | "display_order">;
        Update: Partial<Match>;
        Relationships: [];
      };
      configs: {
        Row: Config;
        Insert: Partial<Config> & Pick<Config, "key" | "value">;
        Update: Partial<Config>;
        Relationships: [];
      };
      uploads: {
        Row: Upload;
        Insert: Partial<Upload> &
          Pick<
            Upload,
            "participant_id" | "uploaded_by_user_id" | "file_name" | "file_type" | "storage_path"
          >;
        Update: Partial<Upload>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      match_status: "PENDING" | "FINISHED" | "CANCELLED";
    };
    CompositeTypes: Record<string, never>;
  };
};
