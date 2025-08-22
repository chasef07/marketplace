'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  Bot,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { apiClient } from '@/src/lib/api-client-new'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { BLUR_PLACEHOLDERS } from '@/src/lib/blur-data'

type OfferStatus = 'pending' | 'accepted' | 'declined' | 'superseded' | 'expired'

interface BuyerOffer {
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
    starting_price: number
    image_filename?: string
    agent_enabled: boolean
  }
  seller: {
    username: string
  }
  latest_seller_offer?: {
    price: number
    created_at: string
  }
  negotiation_status: 'active' | 'completed' | 'cancelled'
}

interface BuyerOfferManagerProps {
  userId: string
  onOfferConfirmed?: () => void
  initialOfferItemId?: number // For direct offer creation from item page
}

export default function BuyerOfferManager({ userId, onOfferConfirmed, initialOfferItemId }: BuyerOfferManagerProps) {
  const [offers, setOffers] = useState<BuyerOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOfferForm, setShowOfferForm] = useState<number | null>(null)
  const [offerPrice, setOfferPrice] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true)
      const negotiations = await apiClient.getMyNegotiations()
      
      // Transform negotiations into buyer offers
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
              starting_price: neg.items.starting_price,
              image_filename: neg.items.image_filename,
              agent_enabled: neg.items.agent_enabled || false
            },
            seller: {
              username: neg.profiles?.username || 'Unknown'
            },
            latest_seller_offer: latestSellerOffer ? {
              price: latestSellerOffer.price,
              created_at: latestSellerOffer.created_at
            } : undefined,
            negotiation_status: neg.status
          }
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setOffers(buyerOffers)
    } catch (err) {
      console.error('Failed to fetch offers:', err)
      setError('Failed to load your offers')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const getOfferStatus = (negotiation: any, latestBuyerOffer: any, latestSellerOffer: any): OfferStatus => {
    if (negotiation.status === 'completed') return 'accepted'
    if (negotiation.status === 'cancelled') return 'declined'
    
    if (latestSellerOffer && latestBuyerOffer) {
      const sellerOfferTime = new Date(latestSellerOffer.created_at).getTime()
      const buyerOfferTime = new Date(latestBuyerOffer.created_at).getTime()
      
      if (sellerOfferTime > buyerOfferTime) {
        return 'superseded' // Seller has made a counter-offer
      }
    }
    
    return 'pending'
  }

  const handleSubmitOffer = async (itemId: number) => {
    if (!offerPrice || submitting) return

    try {
      setSubmitting(true)
      await apiClient.createOffer(itemId, parseFloat(offerPrice), offerMessage)
      
      // Show confirmation
      onOfferConfirmed?.()
      
      // Reset form
      setOfferPrice('')
      setOfferMessage('')
      setShowOfferForm(null)
      
      // Refresh offers
      await fetchOffers()
    } catch (err) {
      console.error('Failed to submit offer:', err)
      alert('Failed to submit offer. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCounterOffer = async (negotiationId: number, price: number) => {
    try {
      setSubmitting(true)
      await apiClient.counterOffer(negotiationId, price, `Counter offer: $${price}`)
      
      // Show confirmation
      onOfferConfirmed?.()
      
      // Refresh offers
      await fetchOffers()
    } catch (err) {
      console.error('Failed to submit counter offer:', err)
      alert('Failed to submit counter offer. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getItemImageUrl = useCallback((filename?: string) => {
    if (!filename) return null
    const { data } = supabase.storage.from('furniture-images').getPublicUrl(filename)
    return data.publicUrl
  }, [supabase])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date().getTime()
    const then = new Date(dateString).getTime()
    const diffInHours = Math.floor((now - then) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return `${Math.floor(diffInHours / 168)}w ago`
  }

  const getStatusBadge = (offer: BuyerOffer) => {
    switch (offer.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>
      case 'declined':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>
      case 'superseded':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><TrendingUp className="h-3 w-3 mr-1" />Counter Received</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  // Auto-open offer form if coming from item page
  useEffect(() => {
    if (initialOfferItemId && !showOfferForm) {
      setShowOfferForm(initialOfferItemId)
      // Scroll to offer section
      const element = document.getElementById('buyer-offer-manager')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [initialOfferItemId, showOfferForm])

  if (loading) {
    return (
      <Card className="bg-white rounded-2xl shadow-xl border border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              My Offers
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-gray-100 h-24 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white rounded-2xl shadow-xl border border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <span className="text-2xl font-bold text-red-600">Error Loading Offers</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{error}</p>
          <Button onClick={fetchOffers} className="mt-4">Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card id="buyer-offer-manager" className="bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            My Offers ({offers.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {offers.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No offers yet</h3>
            <p className="text-gray-500">
              Browse the marketplace to find items you're interested in and make your first offer!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {offers.map((offer) => (
              <div key={offer.id} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Item Image */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 relative bg-gray-200 rounded-lg overflow-hidden">
                      {getItemImageUrl(offer.item.image_filename) ? (
                        <Image
                          src={getItemImageUrl(offer.item.image_filename)!}
                          alt={offer.item.name}
                          fill
                          className="object-cover"
                          placeholder="blur"
                          blurDataURL={BLUR_PLACEHOLDERS.furniture}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Offer Details */}
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{offer.item.name}</h3>
                        <p className="text-sm text-gray-600">
                          Seller: @{offer.seller.username}
                          {offer.item.agent_enabled && (
                            <span className="ml-2 inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              <Bot className="h-3 w-3 mr-1" />
                              AI Agent
                            </span>
                          )}
                        </p>
                      </div>
                      {getStatusBadge(offer)}
                    </div>

                    {/* Price Information */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Listed Price</p>
                        <p className="font-semibold text-gray-900">{formatPrice(offer.item.starting_price)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Your Offer</p>
                        <p className="font-semibold text-green-600">{formatPrice(offer.price)}</p>
                      </div>
                      {offer.latest_seller_offer && (
                        <div>
                          <p className="text-gray-500">Counter Offer</p>
                          <p className="font-semibold text-blue-600">{formatPrice(offer.latest_seller_offer.price)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500">Submitted</p>
                        <p className="font-semibold text-gray-900">{formatTimeAgo(offer.created_at)}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    {offer.status === 'superseded' && offer.latest_seller_offer && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleCounterOffer(offer.negotiation_id, offer.latest_seller_offer!.price)}
                          disabled={submitting}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept {formatPrice(offer.latest_seller_offer.price)}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowOfferForm(offer.item.id)}
                          disabled={submitting}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Counter Offer
                        </Button>
                      </div>
                    )}

                    {offer.status === 'pending' && (
                      <div className="flex items-center gap-2 text-sm text-yellow-600">
                        <Clock className="h-4 w-4" />
                        Waiting for seller response...
                      </div>
                    )}
                  </div>
                </div>

                {/* Offer Form */}
                {showOfferForm === offer.item.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-semibold mb-3">Make a Counter Offer</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Price
                        </label>
                        <input
                          type="number"
                          value={offerPrice}
                          onChange={(e) => setOfferPrice(e.target.value)}
                          placeholder="Enter amount"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Message (Optional)
                        </label>
                        <input
                          type="text"
                          value={offerMessage}
                          onChange={(e) => setOfferMessage(e.target.value)}
                          placeholder="Add a message to your offer..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleSubmitOffer(offer.item.id)}
                        disabled={!offerPrice || submitting}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {submitting ? 'Submitting...' : 'Submit Counter Offer'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowOfferForm(null)}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}