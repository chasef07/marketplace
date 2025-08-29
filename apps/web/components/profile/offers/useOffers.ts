import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api-client-new'
import { BuyerOffer, OfferStatus } from './types'

export function useOffers(userId: string) {
  const [offers, setOffers] = useState<BuyerOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const getOfferStatus = (negotiation: any, latestBuyerOffer: any, latestSellerOffer: any): OfferStatus => {
    if (negotiation.status === 'buyer_accepted' || negotiation.status === 'deal_pending' || negotiation.status === 'completed') {
      return 'accepted'
    }
    if (negotiation.status === 'cancelled') return 'declined'
    
    if (latestSellerOffer && latestBuyerOffer) {
      const sellerOfferTime = new Date(latestSellerOffer.created_at).getTime()
      const buyerOfferTime = new Date(latestBuyerOffer.created_at).getTime()
      
      if (sellerOfferTime > buyerOfferTime) {
        return 'superseded'
      }
    }
    
    return 'pending'
  }

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const negotiations = await apiClient.getMyNegotiations()
      
      const buyerOffers: BuyerOffer[] = negotiations
        .filter((neg: any) => neg.buyer_id === userId)
        .map((neg: any) => {
          const latestBuyerOffer = neg.offers
            ?.filter((offer: any) => offer.offer_type === 'buyer')
            ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          
          const latestSellerOffer = neg.offers
            ?.filter((offer: any) => offer.offer_type === 'seller')
            ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

          return {
            id: latestBuyerOffer?.id || 0,
            price: latestBuyerOffer?.price || 0,
            message: latestBuyerOffer?.message || '',
            created_at: latestBuyerOffer?.created_at || neg.created_at,
            offer_type: 'buyer' as const,
            is_counter_offer: latestBuyerOffer?.is_counter_offer || false,
            negotiation_id: neg.id,
            status: getOfferStatus(neg, latestBuyerOffer, latestSellerOffer),
            item: {
              id: neg.items.id,
              name: neg.items.name,
              furniture_type: neg.items.furniture_type,
              starting_price: neg.items.starting_price,
              condition: neg.items.condition,
              image_filename: neg.items.image_filename,
              images: neg.items.images,
              views_count: neg.items.views_count || 0,
              created_at: neg.items.created_at,
              agent_enabled: neg.items.agent_enabled || false
            },
            seller: {
              username: neg.seller?.username || 'Unknown'
            },
            latest_seller_offer: latestSellerOffer ? {
              price: latestSellerOffer.price,
              created_at: latestSellerOffer.created_at
            } : undefined,
            negotiation_status: neg.status
          }
        })
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setOffers(buyerOffers)
    } catch (err) {
      console.error('Failed to fetch offers:', err)
      setError('Failed to load your offers')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const submitCounterOffer = useCallback(async (itemId: number, price: string, message: string) => {
    if (!price || submitting) return

    try {
      setSubmitting(true)
      await apiClient.createOffer(itemId, parseFloat(price), message)
      await fetchOffers()
    } catch (err) {
      console.error('Failed to submit offer:', err)
      throw new Error('Failed to submit offer. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [submitting, fetchOffers])

  const buyerAcceptOffer = useCallback(async (negotiationId: number) => {
    try {
      setSubmitting(true)
      await apiClient.buyerAcceptOffer(negotiationId)
      await fetchOffers()
    } catch (err) {
      console.error('Failed to accept counter offer:', err)
      throw new Error('Failed to accept counter offer. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [fetchOffers])

  return {
    offers,
    loading,
    error,
    submitting,
    fetchOffers,
    submitCounterOffer,
    buyerAcceptOffer
  }
}