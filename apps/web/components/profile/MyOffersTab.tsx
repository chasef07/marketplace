'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { apiClient } from '@/lib/api-client-new'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { BLUR_PLACEHOLDERS } from '@/lib/blur-data'

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
    images?: Array<{ filename: string; order: number; is_primary: boolean }>
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

interface MyOffersTabProps {
  userId: string
  onOfferConfirmed?: () => void
  initialOfferItemId?: number
}

export default function MyOffersTab({ userId, onOfferConfirmed, initialOfferItemId }: MyOffersTabProps) {
  const [offers, setOffers] = useState<BuyerOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOfferForm, setShowOfferForm] = useState<number | null>(null)
  const [offerPrice, setOfferPrice] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true)
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
              starting_price: neg.items.starting_price,
              images: neg.items.images,
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

  const handleSubmitOffer = async (itemId: number) => {
    if (!offerPrice || submitting) return

    try {
      setSubmitting(true)
      await apiClient.createOffer(itemId, parseFloat(offerPrice), offerMessage)
      
      onOfferConfirmed?.()
      
      setOfferPrice('')
      setOfferMessage('')
      setShowOfferForm(null)
      
      await fetchOffers()
    } catch (err) {
      console.error('Failed to submit offer:', err)
      alert('Failed to submit offer. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBuyerAccept = async (negotiationId: number) => {
    try {
      setSubmitting(true)
      await apiClient.buyerAcceptOffer(negotiationId)
      
      onOfferConfirmed?.()
      
      await fetchOffers()
    } catch (err) {
      console.error('Failed to accept counter offer:', err)
      alert('Failed to accept counter offer. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getItemImageUrl = useCallback((item: BuyerOffer['item']) => {
    let filename = null
    
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      const primaryImage = item.images.find((img: any) => img.is_primary) || item.images[0]
      filename = primaryImage?.filename
    }
    
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
    if (offer.status === 'accepted') {
      if (offer.negotiation_status === 'buyer_accepted') {
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle className="h-3 w-3 mr-1" />Pending Confirmation</Badge>
      } else if (offer.negotiation_status === 'deal_pending') {
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><Clock className="h-3 w-3 mr-1" />Confirmed Sale</Badge>
      } else if (offer.negotiation_status === 'completed') {
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
      }
    }
    
    switch (offer.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>
      case 'declined':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>
      case 'superseded':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><TrendingUp className="h-3 w-3 mr-1" />Counter Received</Badge>
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Unknown</Badge>
    }
  }

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  useEffect(() => {
    if (initialOfferItemId && !showOfferForm) {
      setShowOfferForm(initialOfferItemId)
    }
  }, [initialOfferItemId, showOfferForm])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-slate-100 h-24 rounded-lg"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchOffers}>Try Again</Button>
      </div>
    )
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No offers yet</h3>
        <p className="text-slate-500">
          Browse the marketplace to find items you're interested in and make your first offer!
        </p>
      </div>
    )
  }

  // Organize offers by status
  const activeOffers = offers.filter(offer => offer.status === 'pending' || offer.status === 'superseded')
  const acceptedOffers = offers.filter(offer => offer.status === 'accepted')
  const otherOffers = offers.filter(offer => !['pending', 'superseded', 'accepted'].includes(offer.status))

  const renderOfferCard = (offer: BuyerOffer) => (
    <div key={offer.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-all duration-200">
      <div className="flex flex-col md:flex-row gap-4">
        <Link href={`/marketplace/${offer.item.id}`} className="flex-shrink-0 group">
          <div className="w-16 h-16 relative bg-white rounded-lg overflow-hidden group-hover:ring-2 group-hover:ring-blue-500 transition-all duration-200">
            {getItemImageUrl(offer.item) ? (
              <Image
                src={getItemImageUrl(offer.item)!}
                alt={offer.item.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                placeholder="blur"
                blurDataURL={BLUR_PLACEHOLDERS.furniture}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-slate-400" />
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <Link href={`/marketplace/${offer.item.id}`} className="group">
                <h3 className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors text-sm">
                  {offer.item.name}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <Link href={`/profile/${offer.seller.username}`} className="text-xs text-slate-600 hover:text-blue-600 transition-colors">
                  @{offer.seller.username}
                </Link>
                {offer.item.agent_enabled && (
                  <span className="inline-flex items-center bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full text-xs font-medium">
                    <Bot className="h-2.5 w-2.5 mr-1" />
                    AI
                  </span>
                )}
              </div>
            </div>
            {getStatusBadge(offer)}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-slate-500">Listed</p>
              <p className="font-medium text-slate-900">{formatPrice(offer.item.starting_price)}</p>
            </div>
            <div>
              <p className="text-slate-500">Your Offer</p>
              <p className="font-medium text-blue-600">{formatPrice(offer.price)}</p>
            </div>
            {offer.latest_seller_offer && (
              <div>
                <p className="text-slate-500">Counter</p>
                <p className="font-medium text-orange-600">{formatPrice(offer.latest_seller_offer.price)}</p>
              </div>
            )}
            <div>
              <p className="text-slate-500">Submitted</p>
              <p className="font-medium text-slate-900">{formatTimeAgo(offer.created_at)}</p>
            </div>
          </div>

          {offer.status === 'superseded' && offer.latest_seller_offer && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => handleBuyerAccept(offer.negotiation_id)}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-xs h-8"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Accept {formatPrice(offer.latest_seller_offer.price)}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowOfferForm(offer.item.id)}
                disabled={submitting}
                className="text-xs h-8"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Counter
              </Button>
            </div>
          )}

          {offer.status === 'pending' && (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <Clock className="h-3 w-3" />
              Waiting for seller response...
            </div>
          )}
        </div>
      </div>

      {showOfferForm === offer.item.id && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <h4 className="font-medium mb-3 text-sm">Make a Counter Offer</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Price</Label>
              <Input
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder="Enter amount"
                className="h-8 text-sm"
                min="0"
                step="0.01"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Message (Optional)</Label>
              <Input
                type="text"
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                placeholder="Add a message..."
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => handleSubmitOffer(offer.item.id)}
              disabled={!offerPrice || submitting}
              className="text-xs h-8"
            >
              {submitting ? 'Submitting...' : 'Submit Counter'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowOfferForm(null)}
              disabled={submitting}
              className="text-xs h-8"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2 text-sm">
            <Clock className="h-3 w-3" />
            Active ({activeOffers.length})
          </TabsTrigger>
          <TabsTrigger value="accepted" className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-3 w-3" />
            Accepted ({acceptedOffers.length})
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center gap-2 text-sm">
            <XCircle className="h-3 w-3" />
            Other ({otherOffers.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4 mt-6">
          {activeOffers.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-8 w-8 text-slate-400 mb-3" />
              <p className="text-slate-500 text-sm">No active offers</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOffers.map(renderOfferCard)}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="accepted" className="space-y-4 mt-6">
          {acceptedOffers.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-8 w-8 text-slate-400 mb-3" />
              <p className="text-slate-500 text-sm">No accepted offers yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {acceptedOffers.map(renderOfferCard)}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="other" className="space-y-4 mt-6">
          {otherOffers.length === 0 ? (
            <div className="text-center py-8">
              <XCircle className="mx-auto h-8 w-8 text-slate-400 mb-3" />
              <p className="text-slate-500 text-sm">No other offers</p>
            </div>
          ) : (
            <div className="space-y-3">
              {otherOffers.map(renderOfferCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}