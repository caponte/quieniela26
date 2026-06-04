export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MatchStatus = "scheduled" | "live" | "finished" | "postponed";
export type MatchStage =
  | "group"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";
export type EventType = "goal" | "penalty" | "red_card" | "yellow_card";
export type UserRole = "user" | "admin";
export type LeagueMemberRole = "owner" | "member";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      teams: {
        Row: {
          id: string;
          name: string;
          flag_url: string | null;
          group_name: string;
          fifa_code: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["teams"]["Row"], "created_at" | "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
      };
      matches: {
        Row: {
          id: string;
          home_team_id: string;
          away_team_id: string;
          match_date: string;
          stage: MatchStage;
          group_name: string | null;
          home_score: number | null;
          away_score: number | null;
          status: MatchStatus;
          match_number: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["matches"]["Row"], "created_at" | "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
      };
      match_events: {
        Row: {
          id: string;
          match_id: string;
          type: EventType;
          team_id: string;
          player_name: string | null;
          minute: number | null;
          is_first_goal: boolean;
          is_own_goal: boolean;
          penalty_scored: boolean | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["match_events"]["Row"], "created_at" | "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["match_events"]["Insert"]>;
      };
      leagues: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["leagues"]["Row"], "created_at" | "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["leagues"]["Insert"]>;
      };
      league_members: {
        Row: {
          id: string;
          league_id: string;
          user_id: string;
          role: LeagueMemberRole;
          joined_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["league_members"]["Row"], "joined_at" | "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["league_members"]["Insert"]>;
      };
      bracket_predictions: {
        Row: {
          id: string;
          user_id: string;
          league_id: string | null;
          predictions: Json;
          locked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bracket_predictions"]["Row"], "created_at" | "updated_at" | "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["bracket_predictions"]["Insert"]>;
      };
      bracket_points: {
        Row: {
          id: string;
          user_id: string;
          league_id: string | null;
          total_points: number;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bracket_points"]["Row"], "updated_at" | "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["bracket_points"]["Insert"]>;
      };
      players: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          position: "GK" | "DEF" | "MID" | "FWD" | null;
          jersey_number: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["players"]["Row"], "created_at" | "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
      };
      match_predictions: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          league_id: string | null;
          home_goals: number;
          away_goals: number;
          first_team_to_score: string | null;
          first_goal_scorer: string | null;
          first_goal_scorer_id: string | null;
          has_penalty: boolean;
          submitted_at: string;
          locked_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["match_predictions"]["Row"], "submitted_at" | "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["match_predictions"]["Insert"]>;
      };
      match_points: {
        Row: {
          id: string;
          prediction_id: string;
          base_points: number;
          bonus_points: number;
          total_points: number;
          breakdown: Json;
          calculated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["match_points"]["Row"], "calculated_at" | "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["match_points"]["Insert"]>;
      };
      points_config: {
        Row: {
          id: string;
          category: string;
          points: number;
          description: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["points_config"]["Row"], "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["points_config"]["Insert"]>;
      };
    };
    Views: {
      leaderboard_jornada: {
        Row: {
          user_id: string;
          league_id: string | null;
          total_points: number;
          user_name: string;
          user_avatar: string | null;
        };
      };
      leaderboard_bracket: {
        Row: {
          user_id: string;
          league_id: string | null;
          total_points: number;
          user_name: string;
          user_avatar: string | null;
        };
      };
      leaderboard_total: {
        Row: {
          user_id: string;
          league_id: string | null;
          combined_points: number;
          user_name: string;
          user_avatar: string | null;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: {
      match_status: MatchStatus;
      match_stage: MatchStage;
      event_type: EventType;
      user_role: UserRole;
    };
  };
}
