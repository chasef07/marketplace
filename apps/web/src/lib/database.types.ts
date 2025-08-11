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
      chat_context: {
        Row: {
          active_items: Json
          conversation_id: number
          conversation_summary: string
          last_updated: string
          recent_offers: Json
          seller_preferences: Json
        }
        Insert: {
          active_items?: Json
          conversation_id: number
          conversation_summary?: string
          last_updated?: string
          recent_offers?: Json
          seller_preferences?: Json
        }
        Update: {
          active_items?: Json
          conversation_id?: number
          conversation_summary?: string
          last_updated?: string
          recent_offers?: Json
          seller_preferences?: Json
        }
        Relationships: [
          {
            foreignKeyName: "chat_context_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: number
          created_at: string
          function_calls: Json | null
          function_results: Json | null
          id: number
          metadata: Json
          role: string
        }
        Insert: {
          content: string
          conversation_id: number
          created_at?: string
          function_calls?: Json | null
          function_results?: Json | null
          id?: number
          metadata?: Json
          role: string
        }
        Update: {
          content?: string
          conversation_id?: number
          created_at?: string
          function_calls?: Json | null
          function_results?: Json | null
          id?: number
          metadata?: Json
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: number
          last_message_at: string
          seller_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          last_message_at?: string
          seller_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          last_message_at?: string
          seller_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          brand: string | null
          buyer_id: string | null
          color: string | null
          condition: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          final_price: number | null
          furniture_type: Database["public"]["Enums"]["furniture_type"]
          id: number
          image_filename: string | null
          images: Json | null
          is_available: boolean
          material: string | null
          name: string
          seller_id: string
          sold_at: string | null
          starting_price: number
          style: string | null
          updated_at: string
          views_count: number
        }
        Insert: {
          brand?: string | null
          buyer_id?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          final_price?: number | null
          furniture_type: Database["public"]["Enums"]["furniture_type"]
          id?: number
          image_filename?: string | null
          images?: Json | null
          is_available?: boolean
          material?: string | null
          name: string
          seller_id: string
          sold_at?: string | null
          starting_price: number
          style?: string | null
          updated_at?: string
          views_count?: number
        }
        Update: {
          brand?: string | null
          buyer_id?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          final_price?: number | null
          furniture_type?: Database["public"]["Enums"]["furniture_type"]
          id?: number
          image_filename?: string | null
          images?: Json | null
          is_available?: boolean
          material?: string | null
          name?: string
          seller_id?: string
          sold_at?: string | null
          starting_price?: number
          style?: string | null
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
          current_offer_backup: number | null
          expires_at: string | null
          final_price: number | null
          id: number
          item_id: number
          max_rounds: number
          round_number_backup: number
          seller_id: string
          status: Database["public"]["Enums"]["negotiation_status"]
          updated_at: string
        }
        Insert: {
          buyer_id: string
          completed_at?: string | null
          created_at?: string
          current_offer_backup?: number | null
          expires_at?: string | null
          final_price?: number | null
          id?: number
          item_id: number
          max_rounds?: number
          round_number_backup?: number
          seller_id: string
          status?: Database["public"]["Enums"]["negotiation_status"]
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          completed_at?: string | null
          created_at?: string
          current_offer_backup?: number | null
          expires_at?: string | null
          final_price?: number | null
          id?: number
          item_id?: number
          max_rounds?: number
          round_number_backup?: number
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
          round_number: number
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
          round_number: number
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
          round_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "offers_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiation_summary"
            referencedColumns: ["id"]
          },
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
          buyer_personality: string
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_login: string | null
          seller_personality: string
          updated_at: string
          username: string
          zip_code: string | null
        }
        Insert: {
          buyer_personality?: string
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          last_login?: string | null
          seller_personality?: string
          updated_at?: string
          username: string
          zip_code?: string | null
        }
        Update: {
          buyer_personality?: string
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          seller_personality?: string
          updated_at?: string
          username?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      seller_chat_optimized: {
        Row: {
          context: Json | null
          conversation_id: number | null
          created_at: string | null
          last_message_at: string | null
          messages: Json | null
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          context?: Json | null
          conversation_id?: number | null
          created_at?: string | null
          last_message_at?: string | null
          messages?: Json | null
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          context?: Json | null
          conversation_id?: number | null
          created_at?: string | null
          last_message_at?: string | null
          messages?: Json | null
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_chat_optimized_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      marketplace_analytics: {
        Row: {
          active_buyers: number | null
          active_sellers: number | null
          avg_deal_price: number | null
          avg_response_time: number | null
          completed_deals: number | null
          date: string | null
          total_negotiations: number | null
        }
        Relationships: []
      }
      negotiation_summary: {
        Row: {
          buyer_id: string | null
          created_at: string | null
          current_offer: number | null
          final_price: number | null
          id: number | null
          initial_offer: number | null
          item_id: number | null
          latest_message: string | null
          latest_offer_type: Database["public"]["Enums"]["offer_type"] | null
          seller_id: string | null
          status: Database["public"]["Enums"]["negotiation_status"] | null
          total_offers: number | null
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
      negotiations_enhanced: {
        Row: {
          buyer_id: string | null
          completed_at: string | null
          created_at: string | null
          current_offer: number | null
          expires_at: string | null
          final_price: number | null
          id: number | null
          is_expired: boolean | null
          item_id: number | null
          latest_message: string | null
          max_rounds: number | null
          round_number: number | null
          seller_id: string | null
          status: Database["public"]["Enums"]["negotiation_status"] | null
          updated_at: string | null
        }
        Insert: {
          buyer_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_offer?: never
          expires_at?: string | null
          final_price?: number | null
          id?: number | null
          is_expired?: never
          item_id?: number | null
          latest_message?: never
          max_rounds?: number | null
          round_number?: never
          seller_id?: string | null
          status?: Database["public"]["Enums"]["negotiation_status"] | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_offer?: never
          expires_at?: string | null
          final_price?: number | null
          id?: number | null
          is_expired?: never
          item_id?: number | null
          latest_message?: never
          max_rounds?: number | null
          round_number?: never
          seller_id?: string | null
          status?: Database["public"]["Enums"]["negotiation_status"] | null
          updated_at?: string | null
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
        Returns: number
      }
      get_latest_offer_message: {
        Args: { neg_id: number }
        Returns: string
      }
      get_round_count: {
        Args: { neg_id: number }
        Returns: number
      }
      get_seller_negotiations_summary: {
        Args: { seller_uuid: string }
        Returns: {
          negotiation_id: number
          item_name: string
          buyer_name: string
          current_offer: number
          starting_price: number
          offer_percentage: number
          status: Database["public"]["Enums"]["negotiation_status"]
          last_activity: string
        }[]
      }
      increment_views: {
        Args: { item_id: number }
        Returns: undefined
      }
      is_negotiation_expired: {
        Args: { neg_id: number }
        Returns: boolean
      }
      refresh_marketplace_analytics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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