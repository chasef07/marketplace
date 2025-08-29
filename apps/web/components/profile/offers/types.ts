/**
 * Offer-related types for profile components
 */

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'superseded' | 'expired'

export interface BuyerOffer {
  id: number
  price: number
  message: string
  created_at: string
  offer_type: 'buyer' | 'seller'
  is_counter_offer: boolean
  negotiation_id: number
  status: OfferStatus
  item: {
    id: number
    name: string
    furniture_type: string
    starting_price: number
    condition?: string
    image_filename?: string
    images?: Array<{ filename: string; order: number; is_primary: boolean }>
    views_count: number
    created_at: string
    agent_enabled: boolean
  }
  seller: {
    username: string
  }
  latest_seller_offer?: {
    price: number
    created_at: string
  }
  negotiation_status: 'active' | 'buyer_accepted' | 'deal_pending' | 'completed' | 'cancelled'
}

export interface MyOffersTabProps {
  userId: string
  onOfferConfirmed?: () => void
  initialOfferItemId?: number
}