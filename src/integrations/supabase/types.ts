export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      conversation_participants: {
        Row: {
          conversation_id: string;
          joined_at: string | null;
          last_read_at: string | null;
          user_npub: string;
        };
        Insert: {
          conversation_id: string;
          joined_at?: string | null;
          last_read_at?: string | null;
          user_npub: string;
        };
        Update: {
          conversation_id?: string;
          joined_at?: string | null;
          last_read_at?: string | null;
          user_npub?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_participants_user_npub_fkey";
            columns: ["user_npub"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["npub"];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string | null;
          id: string;
          name: string | null;
          type: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name?: string | null;
          type?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string | null;
          type?: string | null;
        };
        Relationships: [];
      };
      friends: {
        Row: {
          created_at: string | null;
          friend_npub: string;
          id: string;
          status: string | null;
          user_npub: string;
        };
        Insert: {
          created_at?: string | null;
          friend_npub: string;
          id?: string;
          status?: string | null;
          user_npub: string;
        };
        Update: {
          created_at?: string | null;
          friend_npub?: string;
          id?: string;
          status?: string | null;
          user_npub?: string;
        };
        Relationships: [
          {
            foreignKeyName: "friends_friend_npub_fkey";
            columns: ["friend_npub"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["npub"];
          },
          {
            foreignKeyName: "friends_user_npub_fkey";
            columns: ["user_npub"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["npub"];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string | null;
          edited_at: string | null;
          id: string;
          is_nudge: boolean;
          sender_npub: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string | null;
          edited_at?: string | null;
          id?: string;
          is_nudge?: boolean;
          sender_npub: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string | null;
          edited_at?: string | null;
          id?: string;
          is_nudge?: boolean;
          sender_npub?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_npub_fkey";
            columns: ["sender_npub"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["npub"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_sigil: string | null;
          created_at: string | null;
          display_name: string | null;
          last_seen: string | null;
          npub: string;
          status: string | null;
          status_message: string | null;
          username: string;
        };
        Insert: {
          avatar_sigil?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          last_seen?: string | null;
          npub: string;
          status?: string | null;
          status_message?: string | null;
          username: string;
        };
        Update: {
          avatar_sigil?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          last_seen?: string | null;
          npub?: string;
          status?: string | null;
          status_message?: string | null;
          username?: string;
        };
        Relationships: [];
      };
      typing_indicators: {
        Row: {
          conversation_id: string;
          started_at: string | null;
          user_npub: string;
        };
        Insert: {
          conversation_id: string;
          started_at?: string | null;
          user_npub: string;
        };
        Update: {
          conversation_id?: string;
          started_at?: string | null;
          user_npub?: string;
        };
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "typing_indicators_user_npub_fkey";
            columns: ["user_npub"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["npub"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_friend_requests: {
        Args: { npub: string };
        Returns: {
          avatar_sigil: string;
          created_at: string;
          display_name: string;
          id: string;
          user_npub: string;
          username: string;
        }[];
      };
      get_or_create_dm: {
        Args: { npub_a: string; npub_b: string };
        Returns: string;
      };
      get_unread_counts: {
        Args: { npub: string };
        Returns: {
          conversation_id: string;
          unread: number;
        }[];
      };
      search_users: {
        Args: { query: string };
        Returns: {
          avatar_sigil: string | null;
          created_at: string | null;
          display_name: string | null;
          last_seen: string | null;
          npub: string;
          status: string | null;
          status_message: string | null;
          username: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "profiles";
          isOneToOne: false;
          isSetofReturn: true;
        };
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
