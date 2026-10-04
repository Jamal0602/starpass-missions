export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_submissions: {
        Row: {
          created_at: string
          id: string
          mission_day: number
          profile_id: string
          response: string
        }
        Insert: {
          created_at?: string
          id?: string
          mission_day: number
          profile_id: string
          response: string
        }
        Update: {
          created_at?: string
          id?: string
          mission_day?: number
          profile_id?: string
          response?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_submissions_mission_day_fkey"
            columns: ["mission_day"]
            isOneToOne: false
            referencedRelation: "mission_schedules"
            referencedColumns: ["mission_day"]
          },
          {
            foreignKeyName: "activity_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collected_badges: {
        Row: {
          claim_speed_seconds: number | null
          claimed_at: string
          granted_by_admin: boolean
          id: string
          mission_day: number
          profile_id: string
        }
        Insert: {
          claim_speed_seconds?: number | null
          claimed_at?: string
          granted_by_admin?: boolean
          id?: string
          mission_day: number
          profile_id: string
        }
        Update: {
          claim_speed_seconds?: number | null
          claimed_at?: string
          granted_by_admin?: boolean
          id?: string
          mission_day?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collected_badges_mission_day_fkey"
            columns: ["mission_day"]
            isOneToOne: false
            referencedRelation: "mission_schedules"
            referencedColumns: ["mission_day"]
          },
          {
            foreignKeyName: "collected_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_schedules: {
        Row: {
          active_date: string
          badge_url: string | null
          end_time: string
          is_force_closed: boolean
          is_force_open: boolean
          mission_day: number
          start_time: string
          theme: string
          title: string
        }
        Insert: {
          active_date: string
          badge_url?: string | null
          end_time?: string
          is_force_closed?: boolean
          is_force_open?: boolean
          mission_day: number
          start_time?: string
          theme: string
          title: string
        }
        Update: {
          active_date?: string
          badge_url?: string | null
          end_time?: string
          is_force_closed?: boolean
          is_force_open?: boolean
          mission_day?: number
          start_time?: string
          theme?: string
          title?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          body: string
          created_at: string
          id: string
          link_url: string | null
          profile_id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          link_url?: string | null
          profile_id: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link_url?: string | null
          profile_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          callsign: string | null
          category: string | null
          created_at: string
          email: string
          full_name: string
          github_url: string | null
          id: string
          instagram_url: string | null
          is_pro: boolean
          linkedin_url: string | null
          passport_id: string
          phone_number: string
          skills: string[]
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          callsign?: string | null
          category?: string | null
          created_at?: string
          email: string
          full_name: string
          github_url?: string | null
          id?: string
          instagram_url?: string | null
          is_pro?: boolean
          linkedin_url?: string | null
          passport_id?: string
          phone_number: string
          skills?: string[]
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          callsign?: string | null
          category?: string | null
          created_at?: string
          email?: string
          full_name?: string
          github_url?: string | null
          id?: string
          instagram_url?: string | null
          is_pro?: boolean
          linkedin_url?: string | null
          passport_id?: string
          phone_number?: string
          skills?: string[]
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_grant_stamp: {
        Args: { _day: number; _passport_id: string }
        Returns: undefined
      }
      claim_badge: {
        Args: { _day: number }
        Returns: {
          claim_speed_seconds: number | null
          claimed_at: string
          granted_by_admin: boolean
          id: string
          mission_day: number
          profile_id: string
        }
        SetofOptions: {
          from: "*"
          to: "collected_badges"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      submit_activity: {
        Args: { _day: number; _response: string }
        Returns: {
          created_at: string
          id: string
          mission_day: number
          profile_id: string
          response: string
        }
        SetofOptions: {
          from: "*"
          to: "activity_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "trainee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "trainee"],
    },
  },
} as const
