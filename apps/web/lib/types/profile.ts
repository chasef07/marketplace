/**
 * Unified Profile Types
 * Consolidates all profile-related interfaces that were duplicated across components
 */

// Base profile data that all profile interfaces extend
export interface BaseProfileData {
  id: string
  username: string
  display_name: string
  bio?: string
  profile_picture_filename?: string
  location: {
    city?: string
    state?: string
    zip_code?: string
  }
  is_verified: boolean
  stats: {
    total_sales: number
    total_purchases: number
    rating_average: number
    rating_count: number
  }
  member_since: string
  last_active?: string
}

// Profile item data for listings
export interface ProfileItem {
  id: number
  name: string
  description?: string
  furniture_type: string
  starting_price: number
  condition?: string
  image_filename?: string
  images?: Array<{ 
    filename: string
    order: number
    is_primary: boolean 
  }>
  views_count: number
  created_at: string
  highest_buyer_offer?: number
  item_status?: 'draft' | 'pending_review' | 'active' | 'under_negotiation' | 'sold_pending' | 'sold' | 'paused' | 'archived' | 'flagged' | 'removed'
}

// Full profile data with items (used in profile views)
export interface ProfileData extends BaseProfileData {
  active_items: ProfileItem[]
}

// User data used across the app
export interface User {
  id: string
  username: string
  email: string
  seller_personality: string
  buyer_personality: string
  is_active: boolean
  created_at: string
  last_login?: string
}

// Profile edit form data (subset for editing)
export interface ProfileEditData {
  display_name: string
  bio?: string
  profile_picture_filename?: string
  location: {
    city?: string
    state?: string
    zip_code?: string
  }
}

// Offer-related types used in profile tabs
export interface ProfileOffer {
  id: number
  negotiation_id: number
  offer_type: 'buyer' | 'seller'
  price: number
  message: string | null
  round_number: number
  created_at: string
  is_counter_offer: boolean
  agent_generated?: boolean
  buyer_id?: string
  seller_id?: string
}

export interface ProfileNegotiation {
  id: number
  item_id: number
  seller_id: string
  buyer_id: string
  current_offer: number
  final_price?: number
  status: 'active' | 'buyer_accepted' | 'deal_pending' | 'completed' | 'cancelled' | 'picked_up'
  round_number: number
  created_at: string
  updated_at: string
  item?: {
    id: number
    name: string
    starting_price: number
    image_filename?: string
    images?: Array<{ filename: string; order: number; is_primary: boolean }>
    seller?: {
      id: string
      username: string
    }
  }
  seller?: {
    id: string
    username: string
  }
  buyer?: {
    id: string
    username: string
  }
  offers?: ProfileOffer[]
}

// Activity/notification types
export interface ProfileActivity {
  id: string
  type: 'offer_received' | 'offer_accepted' | 'offer_declined' | 'item_sold' | 'item_viewed'
  message: string
  created_at: string
  read: boolean
  related_item_id?: number
  related_user_id?: string
}

// Props interfaces for profile components
export interface ProfileHeaderProps {
  profile: ProfileData
  isOwnProfile?: boolean
}

export interface ProfileTabsProps {
  profile: ProfileData
  isOwnProfile?: boolean
  currentUser?: User | null
}

export interface MyListingsTabProps {
  profile: ProfileData
  isOwnProfile?: boolean
}

export interface MyOffersTabProps {
  currentUser: User
}

export interface ActivityTabProps {
  currentUser: User
}