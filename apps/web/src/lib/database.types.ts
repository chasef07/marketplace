export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          email: string
          seller_personality: string
          buyer_personality: string
          created_at: string
          updated_at: string
          last_login: string | null
          is_active: boolean
        }
        Insert: {
          id: string
          username: string
          email: string
          seller_personality?: string
          buyer_personality?: string
          created_at?: string
          updated_at?: string
          last_login?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          username?: string
          email?: string
          seller_personality?: string
          buyer_personality?: string
          created_at?: string
          updated_at?: string
          last_login?: string | null
          is_active?: boolean
        }
      }
      items: {
        Row: {
          id: number
          seller_id: string
          name: string
          description: string | null
          furniture_type: 'couch' | 'dining_table' | 'bookshelf' | 'chair' | 'desk' | 'bed' | 'dresser' | 'coffee_table' | 'nightstand' | 'cabinet' | 'other'
          starting_price: number
          condition: string | null
          image_filename: string | null
          is_available: boolean
          views_count: number
          dimensions: string | null
          material: string | null
          brand: string | null
          color: string | null
          created_at: string
          updated_at: string
          sold_at: string | null
        }
        Insert: {
          id?: number
          seller_id: string
          name: string
          description?: string | null
          furniture_type: 'couch' | 'dining_table' | 'bookshelf' | 'chair' | 'desk' | 'bed' | 'dresser' | 'coffee_table' | 'nightstand' | 'cabinet' | 'other'
          starting_price: number
          condition?: string | null
          image_filename?: string | null
          is_available?: boolean
          views_count?: number
          dimensions?: string | null
          material?: string | null
          brand?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
          sold_at?: string | null
        }
        Update: {
          id?: number
          seller_id?: string
          name?: string
          description?: string | null
          furniture_type?: 'couch' | 'dining_table' | 'bookshelf' | 'chair' | 'desk' | 'bed' | 'dresser' | 'coffee_table' | 'nightstand' | 'cabinet' | 'other'
          starting_price?: number
          condition?: string | null
          image_filename?: string | null
          is_available?: boolean
          views_count?: number
          dimensions?: string | null
          material?: string | null
          brand?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
          sold_at?: string | null
        }
      }
      negotiations: {
        Row: {
          id: number
          item_id: number
          seller_id: string
          buyer_id: string
          status: 'active' | 'deal_pending' | 'completed' | 'cancelled'
          current_offer: number | null
          final_price: number | null
          round_number: number
          max_rounds: number
          created_at: string
          updated_at: string
          completed_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: number
          item_id: number
          seller_id: string
          buyer_id: string
          status?: 'active' | 'deal_pending' | 'completed' | 'cancelled'
          current_offer?: number | null
          final_price?: number | null
          round_number?: number
          max_rounds?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: number
          item_id?: number
          seller_id?: string
          buyer_id?: string
          status?: 'active' | 'deal_pending' | 'completed' | 'cancelled'
          current_offer?: number | null
          final_price?: number | null
          round_number?: number
          max_rounds?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          expires_at?: string | null
        }
      }
      offers: {
        Row: {
          id: number
          negotiation_id: number
          offer_type: 'buyer' | 'seller'
          price: number
          message: string | null
          round_number: number
          response_time_seconds: number | null
          is_counter_offer: boolean
          created_at: string
        }
        Insert: {
          id?: number
          negotiation_id: number
          offer_type: 'buyer' | 'seller'
          price: number
          message?: string | null
          round_number: number
          response_time_seconds?: number | null
          is_counter_offer?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          negotiation_id?: number
          offer_type?: 'buyer' | 'seller'
          price?: number
          message?: string | null
          round_number?: number
          response_time_seconds?: number | null
          is_counter_offer?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      furniture_type: 'couch' | 'dining_table' | 'bookshelf' | 'chair' | 'desk' | 'bed' | 'dresser' | 'coffee_table' | 'nightstand' | 'cabinet' | 'other'
      negotiation_status: 'active' | 'deal_pending' | 'completed' | 'cancelled'
      offer_type: 'buyer' | 'seller'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}