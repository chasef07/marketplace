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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      agent_decisions: {
        Row: {
          buyer_valuation_estimate: number | null
          confidence_score: number | null
          created_at: string | null
          decision_type: string
          execution_time_ms: number | null
          id: number
          item_id: number | null
          listing_price: number | null
          market_conditions: Json | null
          nash_equilibrium_price: number | null
          negotiation_id: number
          original_offer_price: number | null
          reasoning: string | null
          recommended_price: number | null
          seller_id: string | null
          seller_notified_at: string | null
          seller_response: string | null
          tool_calls: Json | null
        }
        Insert: {
          buyer_valuation_estimate?: number | null
          confidence_score?: number | null
          created_at?: string | null
          decision_type: string
          execution_time_ms?: number | null
          id?: number
          item_id?: number | null
          listing_price?: number | null
          market_conditions?: Json | null
          nash_equilibrium_price?: number | null
          negotiation_id: number
          original_offer_price?: number | null
          reasoning?: string | null
          recommended_price?: number | null
          seller_id?: string | null
          seller_notified_at?: string | null
          seller_response?: string | null
          tool_calls?: Json | null
        }
        Update: {
          buyer_valuation_estimate?: number | null
          confidence_score?: number | null
          created_at?: string | null
          decision_type?: string
          execution_time_ms?: number | null
          id?: number
          item_id?: number | null
          listing_price?: number | null
          market_conditions?: Json | null
          nash_equilibrium_price?: number | null
          negotiation_id?: number
          original_offer_price?: number | null
          reasoning?: string | null
          recommended_price?: number | null
          seller_id?: string | null
          seller_notified_at?: string | null
          seller_response?: string | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_decisions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decisions_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decisions_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations_enhanced"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decisions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_processing_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: number
          negotiation_id: number
          offer_id: number
          priority: number | null
          processed_at: string | null
          seller_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: number
          negotiation_id: number
          offer_id: number
          priority?: number | null
          processed_at?: string | null
          seller_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: number
          negotiation_id?: number
          offer_id?: number
          priority?: number | null
          processed_at?: string | null
          seller_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_processing_queue_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_processing_queue_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations_enhanced"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_processing_queue_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: true
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_processing_queue_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_behavior_profiles: {
        Row: {
          avg_negotiation_rounds: number | null
          buyer_id: string
          created_at: string | null
          id: number
          negotiation_style: string | null
          pickup_preference: string | null
          price_flexibility: string | null
          response_time_avg_minutes: number | null
          response_time_pattern: string | null
          success_rate: number | null
          total_offers_made: number | null
          total_successful_purchases: number | null
          updated_at: string | null
        }
        Insert: {
          avg_negotiation_rounds?: number | null
          buyer_id: string
          created_at?: string | null
          id?: number
          negotiation_style?: string | null
          pickup_preference?: string | null
          price_flexibility?: string | null
          response_time_avg_minutes?: number | null
          response_time_pattern?: string | null
          success_rate?: number | null
          total_offers_made?: number | null
          total_successful_purchases?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_negotiation_rounds?: number | null
          buyer_id?: string
          created_at?: string | null
          id?: number
          negotiation_style?: string | null
          pickup_preference?: string | null
          price_flexibility?: string | null
          response_time_avg_minutes?: number | null
          response_time_pattern?: string | null
          success_rate?: number | null
          total_offers_made?: number | null
          total_successful_purchases?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_behavior_profiles_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          agent_enabled: boolean | null
          buyer_id: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          final_price: number | null
          furniture_type: Database["public"]["Enums"]["furniture_type"]
          id: number
          images: Json | null
          item_status: Database["public"]["Enums"]["item_status"]
          name: string
          seller_id: string
          sold_at: string | null
          starting_price: number
          status_changed_at: string
          updated_at: string
          views_count: number
        }
        Insert: {
          agent_enabled?: boolean | null
          buyer_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          final_price?: number | null
          furniture_type: Database["public"]["Enums"]["furniture_type"]
          id?: number
          images?: Json | null
          item_status?: Database["public"]["Enums"]["item_status"]
          name: string
          seller_id: string
          sold_at?: string | null
          starting_price: number
          status_changed_at?: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          agent_enabled?: boolean | null
          buyer_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          final_price?: number | null
          furniture_type?: Database["public"]["Enums"]["furniture_type"]
          id?: number
          images?: Json | null
          item_status?: Database["public"]["Enums"]["item_status"]
          name?: string
          seller_id?: string
          sold_at?: string | null
          starting_price?: number
          status_changed_at?: string
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
          agent_decision_id: number | null
          agent_generated: boolean | null
          created_at: string
          id: number
          is_counter_offer: boolean
          is_message_only: boolean
          message: string | null
          negotiation_id: number
          offer_type: Database["public"]["Enums"]["offer_type"]
          price: number | null
          response_time_seconds: number | null
          round_number: number | null
        }
        Insert: {
          agent_decision_id?: number | null
          agent_generated?: boolean | null
          created_at?: string
          id?: number
          is_counter_offer?: boolean
          is_message_only?: boolean
          message?: string | null
          negotiation_id: number
          offer_type: Database["public"]["Enums"]["offer_type"]
          price?: number | null
          response_time_seconds?: number | null
          round_number?: number | null
        }
        Update: {
          agent_decision_id?: number | null
          agent_generated?: boolean | null
          created_at?: string
          id?: number
          is_counter_offer?: boolean
          is_message_only?: boolean
          message?: string | null
          negotiation_id?: number
          offer_type?: Database["public"]["Enums"]["offer_type"]
          price?: number | null
          response_time_seconds?: number | null
          round_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_agent_decision_id_fkey"
            columns: ["agent_decision_id"]
            isOneToOne: false
            referencedRelation: "agent_decisions"
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
      seller_agent_profile: {
        Row: {
          agent_enabled: boolean | null
          aggressiveness_level: number | null
          auto_accept_threshold: number | null
          created_at: string | null
          min_acceptable_ratio: number | null
          response_delay_minutes: number | null
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          agent_enabled?: boolean | null
          aggressiveness_level?: number | null
          auto_accept_threshold?: number | null
          created_at?: string | null
          min_acceptable_ratio?: number | null
          response_delay_minutes?: number | null
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          agent_enabled?: boolean | null
          aggressiveness_level?: number | null
          auto_accept_threshold?: number | null
          created_at?: string | null
          min_acceptable_ratio?: number | null
          response_delay_minutes?: number | null
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_agent_profile_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      clean_orphaned_agent_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_market_intelligence: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      complete_agent_task: {
        Args:
          | { decision_id?: number; error_msg?: string; queue_id: number }
          | { error_msg?: string; queue_id: number }
        Returns: undefined
      }
      create_offer_transaction: {
        Args: {
          p_agent_decision_id?: number
          p_agent_generated?: boolean
          p_is_counter_offer?: boolean
          p_is_message_only?: boolean
          p_message?: string
          p_negotiation_id: number
          p_offer_type: Database["public"]["Enums"]["offer_type"]
          p_price?: number
          p_user_id: string
        }
        Returns: {
          agent_generated: boolean
          created_at: string
          id: number
          is_counter_offer: boolean
          is_message_only: boolean
          message: string
          negotiation_id: number
          offer_type: Database["public"]["Enums"]["offer_type"]
          price: number
          round_number: number
        }[]
      }
      get_agent_processing_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_agent_seller_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_sellers: number
          total_sellers: number
        }[]
      }
      get_current_offer: {
        Args: { neg_id: number }
        Returns: {
          created_at: string
          offer_type: string
          price: number
        }[]
      }
      get_latest_offer_message: {
        Args: { neg_id: number }
        Returns: string
      }
      get_latest_offer_with_lock: {
        Args: { neg_id: number }
        Returns: {
          agent_decision_id: number | null
          agent_generated: boolean | null
          created_at: string
          id: number
          is_counter_offer: boolean
          is_message_only: boolean
          message: string | null
          negotiation_id: number
          offer_type: Database["public"]["Enums"]["offer_type"]
          price: number | null
          response_time_seconds: number | null
          round_number: number | null
        }
      }
      get_next_agent_task: {
        Args: Record<PropertyKey, never>
        Returns: {
          furniture_type: string
          id: number
          item_id: number
          negotiation_id: number
          offer_id: number
          price: number
          seller_id: string
          starting_price: number
        }[]
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
      maintain_agent_system: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_agent_queue_status: {
        Args: { p_error_message?: string; p_queue_id: number; p_status: string }
        Returns: boolean
      }
      update_buyer_behavior_profile: {
        Args: { buyer_uuid: string }
        Returns: undefined
      }
      update_market_intelligence: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_seller_chat: {
        Args: { new_message: Json; seller_uuid: string }
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
      item_status:
        | "draft"
        | "pending_review"
        | "active"
        | "under_negotiation"
        | "sold_pending"
        | "sold"
        | "paused"
        | "archived"
        | "flagged"
        | "removed"
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
      item_status: [
        "draft",
        "pending_review",
        "active",
        "under_negotiation",
        "sold_pending",
        "sold",
        "paused",
        "archived",
        "flagged",
        "removed",
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