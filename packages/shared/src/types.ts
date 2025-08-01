// Shared types for Marketplace application

export interface SellerInfo {
  id: number
  username: string
}

export interface FurnitureItem {
  id: number
  name: string
  description: string
  starting_price: string
  condition: string
  furniture_type: string
  image_filename: string | null
  seller_id: number
  seller?: SellerInfo
  created_at: string
  updated_at: string
  is_available: boolean
  dimensions?: string
  material?: string
  brand?: string
  color?: string
  views_count?: number
}

export interface AIAnalysisResult {
  success: boolean
  analysis: {
    furniture_type: string
    style: string
    condition_score: number
    condition_notes: string
    material: string
    brand: string
    color: string
    estimated_dimensions: string
    key_features: string[]
  }
  pricing: {
    suggested_starting_price: number
    suggested_min_price: number
    quick_sale_price: number
    market_price: number
    premium_price: number
    pricing_explanation: string
  }
  listing: {
    title: string
    description: string
    furniture_type: string
  }
  image_filename: string
}

export interface CreateAccountData {
  full_name: string
  email: string
  phone: string
  location: string
  username: string
  password: string
}

export interface CreateListingData {
  name: string
  description: string
  furniture_type: string
  starting_price: number
  condition: string
  image_filename: string
}

export interface SearchQuery {
  query: string
  limit?: number
  offset?: number
}

export interface SearchResponse {
  success: boolean
  items: FurnitureItem[]
  total_count: number
  query_interpretation: string
}

export interface SearchSuggestion {
  suggestions: string[]
}

export interface User {
  id: number
  username: string
  email: string
  full_name?: string
  phone?: string
  location?: string
}

export interface Negotiation {
  id: number
  item_id: number
  seller_id: number
  buyer_id: number
  status: string
  created_at: string
  updated_at: string
}

export interface Offer {
  id: number
  negotiation_id: number
  sender_id: number
  amount: number
  message: string
  is_accepted: boolean
  created_at: string
}