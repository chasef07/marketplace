export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      items: {
        Row: {
          buyer_id: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          final_price: number | null
          furniture_type: Database["public"]["Enums"]["furniture_type"]
          id: number
          images: Json | null
          is_available: boolean
          name: string
          seller_id: string
          sold_at: string | null
          starting_price: number
          updated_at: string
          views_count: number
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          final_price?: number | null
          furniture_type: Database["public"]["Enums"]["furniture_type"]
          id?: number
          images?: Json | null
          is_available?: boolean
          name: string
          seller_id: string
          sold_at?: string | null
          starting_price: number
          updated_at?: string
          views_count?: number
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          final_price?: number | null
          furniture_type?: Database["public"]["Enums"]["furniture_type"]
          id?: number
          images?: Json | null
          is_available?: boolean
          name?: string
          seller_id?: string
          sold_at?: string | null
          starting_price?: number
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          buyer_id: string
          completed_at: string | null
          created_at: string
          expires_at: string | null
          final_price: number | null
          id: number
          item_id: number
          seller_id: string
          status: Database["public"]["Enums"]["negotiation_status"]
          updated_at: string
        }
        Insert: {
          buyer_id: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          final_price?: number | null
          id?: number
          item_id: number
          seller_id: string
          status?: Database["public"]["Enums"]["negotiation_status"]
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          final_price?: number | null
          id?: number
          item_id?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["negotiation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          id: number
          is_counter_offer: boolean
          is_message_only: boolean
          message: string | null
          negotiation_id: number
          offer_type: Database["public"]["Enums"]["offer_type"]
          price: number | null
          response_time_seconds: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          is_counter_offer?: boolean
          is_message_only?: boolean
          message?: string | null
          negotiation_id: number
          offer_type: Database["public"]["Enums"]["offer_type"]
          price?: number | null
          response_time_seconds?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          is_counter_offer?: boolean
          is_message_only?: boolean
          message?: string | null
          negotiation_id?: number
          offer_type?: Database["public"]["Enums"]["offer_type"]
          price?: number | null
          response_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations_enhanced"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_login: string | null
          updated_at: string
          username: string
          zip_code: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          last_login?: string | null
          updated_at?: string
          username: string
          zip_code?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          updated_at?: string
          username?: string
          zip_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      negotiations_enhanced: {
        Row: {
          buyer_id: string | null
          buyer_username: string | null
          completed_at: string | null
          created_at: string | null
          expires_at: string | null
          final_price: number | null
          id: number | null
          image_filename: string | null
          item_description: string | null
          item_id: number | null
          item_name: string | null
          latest_offer_price: number | null
          offer_count: number | null
          seller_id: string | null
          seller_username: string | null
          starting_price: number | null
          status: Database["public"]["Enums"]["negotiation_status"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_current_offer: {
        Args: { neg_id: number }
        Returns: {
          price: number
          offer_type: string
          created_at: string
        }[]
      }
      get_latest_offer_message: {
        Args: { neg_id: number }
        Returns: string
      }
      get_primary_image: {
        Args: { images_jsonb: Json }
        Returns: string
      }
      get_round_count: {
        Args: { neg_id: number }
        Returns: number
      }
      increment_views: {
        Args: { item_id: number }
        Returns: undefined
      }
      is_negotiation_expired: {
        Args: { neg_id: number }
        Returns: boolean
      }
      update_seller_chat: {
        Args: { seller_uuid: string; new_message: Json }
        Returns: undefined
      }
    }
    Enums: {
      furniture_type:
        | "couch"
        | "dining_table"
        | "bookshelf"
        | "chair"
        | "desk"
        | "bed"
        | "dresser"
        | "coffee_table"
        | "nightstand"
        | "cabinet"
        | "other"
      negotiation_status:
        | "active"
        | "deal_pending"
        | "completed"
        | "cancelled"
        | "picked_up"
      offer_type: "buyer" | "seller"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      furniture_type: [
        "couch",
        "dining_table",
        "bookshelf",
        "chair",
        "desk",
        "bed",
        "dresser",
        "coffee_table",
        "nightstand",
        "cabinet",
        "other",
      ],
      negotiation_status: [
        "active",
        "deal_pending",
        "completed",
        "cancelled",
        "picked_up",
      ],
      offer_type: ["buyer", "seller"],
    },
  },
} as const