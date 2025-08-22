'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, MapPin, User, DollarSign, MessageSquare, Edit, Save, X, Bot, Clock, CheckCircle, XCircle, RotateCcw, Brain, Zap } from "lucide-react"
import { apiClient, ImageData } from "@/lib/api-client-new"
import { FURNITURE_BLUR_DATA_URL } from "@/lib/blur-data"
import { ItemDetailSkeleton } from "@/components/ui/skeleton"
import { ImageCarousel } from "@/components/ui/ImageCarousel"
import { createClient } from "@/lib/supabase"

// Lazy load the map component
const LocationMap = dynamic(() => import('@/components/maps/location-map').then(mod => ({ default: mod.LocationMap })), {
  loading: () => <div className="h-32 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
    <MapPin className="h-6 w-6 text-gray-400" />
  </div>,
  ssr: false
})

interface SellerInfo {
  id: number
  username: string
  zip_code?: string
}

interface FurnitureItem {
  id: number
  name: string
  description: string
  starting_price: string
  furniture_type: string
  image_filename: string | null // Backward compatibility
  images?: ImageData[] // New multiple images support
  seller_id: string
  seller?: SellerInfo
  created_at: string
  updated_at: string
  item_status: 'draft' | 'pending_review' | 'active' | 'under_negotiation' | 'sold_pending' | 'sold' | 'paused' | 'archived' | 'flagged' | 'removed'
  agent_enabled?: boolean
  style?: string
  dimensions?: string
  material?: string
  brand?: string
  color?: string
  views_count?: number
}

interface User {
  id: string
  username: string
  email: string
  seller_personality: string
  buyer_personality: string
  is_active: boolean
  created_at: string
  last_login?: string
}

interface Negotiation {
  id: number
  item_id: number
  seller_id: string
  buyer_id: string
  current_offer: number
  final_price?: number
  status: string
  round_number: number
  created_at: string
  updated_at: string
}

interface AgentDecision {
  id: number
  decision_type: string
  confidence_score: number
  reasoning: string
  created_at: string
}

interface Offer {
  id: number
  negotiation_id: number
  offer_type: string
  price: number
  message: string | null
  round_number: number
  created_at: string
  is_counter_offer: boolean
  agent_generated?: boolean
  agent_decisions?: AgentDecision[]
  buyer_id?: string
  seller_id?: string
}

interface ItemDetailProps {
  itemId: number
  user: User | null
  onBack: () => void
  onMakeOffer?: (itemId: number, offer: number, message: string) => void
  onSignInClick?: () => void
  onViewProfile?: (username: string) => void
}

export function ItemDetail({ itemId, user, onBack, onMakeOffer, onSignInClick, onViewProfile }: ItemDetailProps) {
  const [item, setItem] = useState<FurnitureItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [showMessages, setShowMessages] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isConnectedToRealtime, setIsConnectedToRealtime] = useState(false)
  const [realtimeError, setRealtimeError] = useState<string | null>(null)
  const [offerActionLoading, setOfferActionLoading] = useState<string | null>(null)
  const subscriptionsRef = useRef<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<{
    description: string;
    starting_price: string;
    item_status: 'draft' | 'pending_review' | 'active' | 'under_negotiation' | 'sold_pending' | 'sold' | 'paused' | 'archived' | 'flagged' | 'removed';
  }>({
    description: '',
    starting_price: '',
    item_status: 'active'
  })
  const [saveLoading, setSaveLoading] = useState(false)

  // Memoize user ID to prevent unnecessary re-fetches when user object changes
  const userId = useMemo(() => user?.id, [user?.id])
  
  const fetchItem = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiClient.getItem(itemId)
      setItem(response)
    } catch (err) {
      setError('Failed to load item details')
    } finally {
      setLoading(false)
    }
  }, [itemId])

  const fetchNegotiation = useCallback(async () => {
    if (!userId) return
    
    try {
      const negotiations = await apiClient.getMyNegotiations()
      const itemNegotiation = negotiations?.find((neg: Negotiation) => 
        neg.item_id === itemId && neg.buyer_id === userId
      )
      setNegotiation(itemNegotiation || null)
    } catch (err) {
      console.error('Failed to fetch negotiation:', err)
    }
  }, [itemId, userId])

  useEffect(() => {
    fetchItem()
  }, [itemId, fetchItem])
  
  useEffect(() => {
    if (userId) {
      fetchNegotiation()
    }
  }, [itemId, userId])

  // Real-time subscriptions for offers and negotiations
  useEffect(() => {
    if (!negotiation || !userId) return

    const supabase = createClient()
    console.log('🔄 Setting up real-time subscriptions for negotiation:', negotiation.id)

    // Subscribe to offers for this negotiation
    const offersChannel = supabase
      .channel(`offers_${negotiation.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers',
          filter: `negotiation_id=eq.${negotiation.id}`
        },
        (payload) => {
          console.log('📡 Real-time offer update:', payload)
          // Refresh offers when any offer changes
          fetchOffers().catch(err => {
            console.error('Failed to refresh offers from real-time update:', err)
            setRealtimeError('Failed to load latest offers')
          })
        }
      )
      .subscribe((status) => {
        console.log('📡 Offers subscription status:', status)
        setIsConnectedToRealtime(status === 'SUBSCRIBED')
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeError('Real-time connection lost')
        } else if (status === 'SUBSCRIBED') {
          setRealtimeError(null)
        }
      })

    // Subscribe to negotiation status changes
    const negotiationChannel = supabase
      .channel(`negotiation_${negotiation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'negotiations',
          filter: `id=eq.${negotiation.id}`
        },
        (payload) => {
          console.log('📡 Real-time negotiation update:', payload)
          // Refresh negotiation data
          fetchNegotiation().catch(err => {
            console.error('Failed to refresh negotiation from real-time update:', err)
            setRealtimeError('Failed to load latest negotiation data')
          })
        }
      )
      .subscribe((status) => {
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeError('Real-time connection lost')
        }
      })

    // Store subscriptions for cleanup
    subscriptionsRef.current = [offersChannel, negotiationChannel]

    return () => {
      console.log('🧹 Cleaning up real-time subscriptions')
      subscriptionsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      subscriptionsRef.current = []
      setIsConnectedToRealtime(false)
    }
  }, [negotiation?.id, userId])

  const fetchOffers = useCallback(async () => {
    if (!negotiation) return
    
    try {
      setLoadingMessages(true)
      // Enhanced fetch with agent decision data
      const supabase = createClient()
      const { data: offersData, error } = await supabase
        .from('offers')
        .select(`
          *,
          agent_decisions(
            id,
            decision_type,
            confidence_score,
            reasoning,
            created_at
          )
        `)
        .eq('negotiation_id', negotiation.id)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Failed to fetch offers with agent data:', error)
        // Fallback to API client
        const fallbackData = await apiClient.getNegotiationOffers(negotiation.id)
        setOffers(fallbackData || [])
      } else {
        setOffers(offersData || [])
      }
    } catch (err) {
      console.error('Failed to fetch offers:', err)
      // Final fallback
      try {
        const fallbackData = await apiClient.getNegotiationOffers(negotiation.id)
        setOffers(fallbackData || [])
      } catch (fallbackErr) {
        console.error('Fallback fetch also failed:', fallbackErr)
      }
    } finally {
      setLoadingMessages(false)
    }
  }, [negotiation?.id])

  const toggleMessages = async () => {
    if (!showMessages && negotiation && offers.length === 0) {
      await fetchOffers()
    }
    setShowMessages(!showMessages)
  }

  // Enhanced offer actions for AI agent responses
  const handleAcceptOffer = async (offerId: number) => {
    if (!negotiation || offerActionLoading) return
    
    try {
      setOfferActionLoading('accept')
      await apiClient.acceptOffer(negotiation.id)
      // Refresh data after accepting
      await fetchNegotiation()
      await fetchOffers()
    } catch (err) {
      console.error('Failed to accept offer:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept offer. Please try again.'
      alert(errorMessage)
    } finally {
      setOfferActionLoading(null)
    }
  }

  const handleCounterOffer = async (price: number, message: string = '') => {
    if (!negotiation || offerActionLoading) return
    
    try {
      setOfferActionLoading('counter')
      await apiClient.counterOffer(negotiation.id, price, message)
      // Refresh data after counter offer
      await fetchNegotiation()
      await fetchOffers()
    } catch (err) {
      console.error('Failed to create counter offer:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create counter offer. Please try again.'
      alert(errorMessage)
    } finally {
      setOfferActionLoading(null)
    }
  }

  const handleDeclineOffer = async (reason: string = 'Unable to accept this offer.') => {
    if (!negotiation || offerActionLoading) return
    
    try {
      setOfferActionLoading('decline')
      await apiClient.declineOffer(negotiation.id, reason)
      // Refresh data after declining
      await fetchNegotiation()
      await fetchOffers()
    } catch (err) {
      console.error('Failed to decline offer:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to decline offer. Please try again.'
      alert(errorMessage)
    } finally {
      setOfferActionLoading(null)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const created = new Date(timestamp)
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
    
    if (diffMinutes < 0) return 'Just now'
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d ago`
    
    const diffMonths = Math.floor(diffDays / 30)
    return `${diffMonths}mo ago`
  }


  const handleMakeOffer = async () => {
    if (!onMakeOffer || !offerAmount) return
    
    const amount = parseFloat(offerAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid offer amount')
      return
    }


    try {
      await onMakeOffer(itemId, amount, offerMessage)
      setShowOfferForm(false)
      setOfferAmount('')
      setOfferMessage('')
      // Clear cache and refresh negotiation data after making an offer
      await fetchNegotiation()
    } catch (err) {
      alert('Failed to submit offer')
    }
  }

  const startEditing = () => {
    if (!item) return
    setEditForm({
      description: item.description || '',
      starting_price: item.starting_price,
      item_status: item.item_status
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditForm({
      description: '',
        starting_price: '',
      item_status: 'active'
    })
  }

  const saveChanges = async () => {
    if (!item) return

    const updates: Partial<{
      description: string;
      condition: string;
      starting_price: number;
      item_status: 'draft' | 'pending_review' | 'active' | 'under_negotiation' | 'sold_pending' | 'sold' | 'paused' | 'archived' | 'flagged' | 'removed';
    }> = {}
    
    if (editForm.description !== item.description) {
      updates.description = editForm.description
    }
    if (parseFloat(editForm.starting_price) !== parseFloat(item.starting_price)) {
      updates.starting_price = parseFloat(editForm.starting_price)
    }
    if (editForm.item_status !== item.item_status) {
      updates.item_status = editForm.item_status
    }

    if (Object.keys(updates).length === 0) {
      setIsEditing(false)
      return
    }

    try {
      setSaveLoading(true)
      await apiClient.updateItem(item.id, updates)
      await fetchItem() // Refresh the item data
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update item:', err)
      alert(err instanceof Error ? err.message : 'Failed to update item. Please try again.')
    } finally {
      setSaveLoading(false)
    }
  }

  const isOwnItem = useMemo(() => userId && item && userId === item.seller_id, [userId, item])
  const isBuyer = useMemo(() => userId && negotiation && negotiation.buyer_id === userId, [userId, negotiation])
  const latestOffer = useMemo(() => offers.length > 0 ? offers[offers.length - 1] : null, [offers])
  const needsResponse = useMemo(() => {
    if (!latestOffer || !isBuyer) return false
    return latestOffer.offer_type === 'seller' && latestOffer.is_counter_offer
  }, [latestOffer, isBuyer])

  // Enhanced offer display component
  const OfferCard = ({ offer, isLatest }: { offer: Offer; isLatest: boolean }) => {
    const isAgentOffer = offer.agent_generated
    const agentDecision = offer.agent_decisions?.[0]
    const isFromSeller = offer.offer_type === 'seller'
    const isFromBuyer = offer.offer_type === 'buyer'
    
    return (
      <Card 
        className={`mb-4 transition-all duration-200 ${
          isLatest ? 'ring-2 ring-blue-200 shadow-lg' : 'shadow-sm'
        } ${
          isAgentOffer ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-white'
        }`}
        role="article"
        aria-label={`${isAgentOffer ? 'AI Agent' : isFromSeller ? 'Seller' : 'Buyer'} offer for $${offer.price?.toFixed(2)}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAgentOffer ? (
                <Badge 
                  className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                  role="img"
                  aria-label="AI Agent generated offer"
                >
                  <Bot className="w-3 h-3 mr-1" aria-hidden="true" />
                  AI Agent
                </Badge>
              ) : (
                <Badge 
                  variant="outline" 
                  className="bg-gray-50"
                  role="img"
                  aria-label={`${isFromSeller ? 'Seller' : 'Buyer'} offer`}
                >
                  <User className="w-3 h-3 mr-1" aria-hidden="true" />
                  {isFromSeller ? 'Seller' : 'Buyer'}
                </Badge>
              )}
              
              {offer.is_counter_offer && (
                <Badge 
                  variant="secondary"
                  role="img"
                  aria-label="Counter offer"
                >
                  <RotateCcw className="w-3 h-3 mr-1" aria-hidden="true" />
                  Counter Offer
                </Badge>
              )}
              
              {isLatest && needsResponse && (
                <Badge 
                  className="bg-yellow-100 text-yellow-800 animate-pulse"
                  role="alert"
                  aria-label="This offer needs your response"
                >
                  <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
                  Needs Response
                </Badge>
              )}
            </div>
            
            <div className="text-sm text-gray-500">
              {formatTimeAgo(offer.created_at)}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span 
                className="text-2xl font-bold text-green-600"
                aria-label={`Offer amount: ${offer.price?.toFixed(2) || '0.00'} dollars`}
              >
                ${offer.price?.toFixed(2) || '0.00'}
              </span>
              
              {agentDecision && (
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-600" aria-hidden="true" />
                  <div className="text-sm">
                    <span 
                      className="font-medium text-blue-700"
                      aria-label={`AI confidence level: ${Math.round((agentDecision.confidence_score || 0) * 100)} percent`}
                    >
                      {Math.round((agentDecision.confidence_score || 0) * 100)}% confident
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {offer.message && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">{offer.message}</p>
              </div>
            )}
            
            {agentDecision?.reasoning && (
              <div 
                className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400"
                role="complementary"
                aria-label="AI reasoning for this offer"
              >
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-blue-600 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 mb-1">AI Reasoning:</p>
                    <p className="text-sm text-blue-700">{agentDecision.reasoning}</p>
                  </div>
                </div>
              </div>
            )}
            
            {isLatest && needsResponse && isBuyer && (
              <div 
                className="flex gap-2 mt-4 pt-4 border-t border-gray-200"
                role="group"
                aria-label="Offer response actions"
              >
                <Button
                  onClick={() => handleAcceptOffer(offer.id)}
                  disabled={!!offerActionLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                  size="sm"
                  aria-label={`Accept offer of ${offer.price?.toFixed(2)} dollars`}
                >
                  {offerActionLoading === 'accept' ? (
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" aria-label="Loading" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">Accept ${offer.price?.toFixed(2)}</span>
                  <span className="sm:hidden">Accept</span>
                </Button>
                
                <Button
                  onClick={() => setShowOfferForm(true)}
                  disabled={!!offerActionLoading}
                  variant="outline"
                  className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                  size="sm"
                  aria-label="Make a counter offer"
                >
                  <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">Counter</span>
                  <span className="sm:hidden">Counter</span>
                </Button>
                
                <Button
                  onClick={() => handleDeclineOffer('Thanks, but I cannot accept this offer.')}
                  disabled={!!offerActionLoading}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  size="sm"
                  aria-label="Decline this offer"
                >
                  {offerActionLoading === 'decline' ? (
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-red-600 border-t-transparent" aria-label="Loading" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">Decline</span>
                  <span className="sm:hidden">Decline</span>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Real-time connection status indicator
  const RealtimeStatus = () => (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${
        realtimeError ? 'bg-red-500' : 
        isConnectedToRealtime ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
      }`} />
      <span className={realtimeError ? 'text-red-600' : 'text-gray-500'}>
        {realtimeError ? 'Connection error' : 
         isConnectedToRealtime ? 'Live updates active' : 'Connecting...'}
      </span>
    </div>
  )

  if (loading) {
    return <ItemDetailSkeleton />
  }

  if (error || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F7F3E9 0%, #E8DDD4 50%, #DDD1C7 100%)' }}>
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Item not found'}</p>
          <Button onClick={onBack} variant="outline" style={{ borderColor: '#8B4513', color: '#8B4513' }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F5F0E8 0%, #FAF7F2 50%, #E8DDD4 100%)' }}>
      {/* Clean Header */}
      <header className="backdrop-blur-md border-b sticky top-0 z-50" style={{ background: 'rgba(250, 247, 242, 0.9)', borderColor: 'rgba(74, 111, 165, 0.1)' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button onClick={onBack} variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketplace
            </Button>
            
            {isOwnItem && (
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button 
                      onClick={cancelEditing} 
                      variant="outline" 
                      size="sm"
                      disabled={saveLoading}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={saveChanges} 
                      size="sm"
                      disabled={saveLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {saveLoading ? 'Saving...' : 'Save'}
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={startEditing} 
                    variant="outline" 
                    size="sm"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Listing
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {/* Image Carousel - Takes up 3 columns on large screens */}
          <div className="lg:col-span-3 space-y-3">
            <div className="overflow-hidden rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 40px rgba(74, 111, 165, 0.1)' }}>
              {(() => {
                // Prepare images array for carousel
                let carouselImages: string[] = []
                
                if (item.images && item.images.length > 0) {
                  // Use new multiple images format
                  carouselImages = item.images.map(img => 
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/furniture-images/${img.filename}`
                  )
                } else if (item.image_filename) {
                  // Use old single image format
                  carouselImages = [`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/furniture-images/${item.image_filename}`]
                }
                
                if (carouselImages.length > 0) {
                  return (
                    <ImageCarousel 
                      images={carouselImages}
                      alt={item.name}
                      className="h-80 lg:h-96"
                    />
                  )
                } else {
                  return (
                    <div className="h-80 lg:h-96 flex items-center justify-center bg-gray-100">
                      <div className="text-8xl">🪑</div>
                    </div>
                  )
                }
              })()}
            </div>
            
            {/* Item Title & Basic Info - Mobile Only */}
            <div className="lg:hidden mb-4">
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#2C3E50' }}>{item.name}</h1>
              <div className="flex items-center justify-between mb-2">
                <p className="text-3xl font-bold" style={{ color: '#7CB342' }}>${item.starting_price}</p>
                {item.agent_enabled && (
                  <div className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    🤖 AI Agent
                  </div>
                )}
              </div>
              <p className="text-sm" style={{ color: '#6B7280' }}>Listed {formatTimeAgo(item.created_at)}</p>
            </div>

            {/* Description - Under Photo */}
            <div className="rounded-xl p-3" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', boxShadow: '0 6px 24px rgba(74, 111, 165, 0.1)' }}>
              <h3 className="text-base font-semibold mb-2" style={{ color: '#2C3E50' }}>Description</h3>
              {isEditing ? (
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                  rows={3}
                  placeholder="Enter item description..."
                />
              ) : (
                <div className="whitespace-pre-wrap leading-snug text-sm" style={{ color: '#4A6FA5' }}>
                  <p>{item.description || 'No description provided.'}</p>
                  {item.dimensions && (
                    <p className="mt-1 pt-1 border-t font-medium text-sm" style={{ borderColor: 'rgba(74, 111, 165, 0.1)', color: '#2C3E50' }}>
                      <span className="font-semibold" style={{ color: '#E89A5C' }}>Dimensions: </span>
                      {item.dimensions}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Details & Actions */}
          <div className="lg:col-span-2 space-y-4">
            {/* Price and Actions Card */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 40px rgba(74, 111, 165, 0.1)' }}>
                {/* Title - Desktop Only */}
                <div className="hidden lg:block mb-5">
                  <h1 className="text-2xl font-bold mb-1" style={{ color: '#2C3E50' }}>{item.name}</h1>
                  <p className="text-sm" style={{ color: '#6B7280' }}>Listed {formatTimeAgo(item.created_at)}</p>
                </div>
                
                {/* Price */}
                <div className="mb-5">
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-3xl font-bold text-gray-900">$</span>
                      <input
                        type="number"
                        value={editForm.starting_price}
                        onChange={(e) => setEditForm(prev => ({ ...prev, starting_price: e.target.value }))}
                        className="text-4xl font-bold pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-4xl font-bold" style={{ color: '#7CB342' }}>${item.starting_price}</p>
                      {item.agent_enabled && (
                        <div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          🤖 AI Agent
                        </div>
                      )}
                    </div>
                  )}
                </div>


                {/* Action Buttons */}
                <div className="space-y-3">
                  {!isOwnItem && user && (
                    <>
                      {/* Make Offer Button */}
                      <Button 
                        onClick={() => setShowOfferForm(true)}
                        className="w-full font-medium text-white hover:opacity-90"
                        style={{ backgroundColor: '#4A6FA5' }}
                        size="lg"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        {negotiation ? 'Make Counter Offer' : 'Make Offer'}
                      </Button>
                      
                      {/* Negotiation Status */}
                      {negotiation && (
                        <div className="rounded-lg p-3 border" style={{ background: 'rgba(74, 111, 165, 0.05)', borderColor: 'rgba(74, 111, 165, 0.1)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium" style={{ color: '#4A6FA5' }}>Active Negotiation</p>
                            <RealtimeStatus />
                          </div>
                          
                          {latestOffer && (
                            <div className="text-xs text-gray-600">
                              Last offer: ${latestOffer.price?.toFixed(2)} • {formatTimeAgo(latestOffer.created_at)}
                              {latestOffer.agent_generated && (
                                <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">
                                  <Bot className="w-2 h-2 mr-1" />
                                  AI
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {needsResponse && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                              <p className="text-xs font-medium text-yellow-800">💬 Waiting for your response</p>
                            </div>
                          )}
                          
                          {realtimeError && (
                            <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                              <p className="text-xs font-medium text-red-800">⚠️ {realtimeError}</p>
                            </div>
                          )}
                          
                          <Button
                            onClick={toggleMessages}
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 text-xs"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {showMessages ? 'Hide' : 'Show'} Offer History ({offers.length})
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                  {!user && (
                    <Button 
                      onClick={onSignInClick}
                      className="w-full font-medium text-white hover:opacity-90" 
                      style={{ backgroundColor: '#4A6FA5' }}
                      size="lg"
                    >
                      Sign in to Make Offer
                    </Button>
                  )}
                  {isOwnItem && (
                    <div className="rounded-lg p-4 border" style={{ background: 'rgba(74, 111, 165, 0.05)', borderColor: 'rgba(74, 111, 165, 0.1)' }}>
                      <p className="text-sm font-medium mb-2" style={{ color: '#4A6FA5' }}>This is your listing</p>
                      
                      {isEditing && (
                        <label className="flex items-center">
                          <select
                            value={editForm.item_status}
                            onChange={(e) => setEditForm(prev => ({ ...prev, item_status: e.target.value as 'active' | 'paused' | 'sold' | 'archived' }))}
                            className="rounded border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="active">Active (Available for sale)</option>
                            <option value="paused">Paused (Temporarily unavailable)</option>
                            <option value="sold">Sold</option>
                            <option value="archived">Archived</option>
                          </select>
                        </label>
                      )}
                    </div>
                  )}
                </div>

                {/* Seller Info */}
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(74, 111, 165, 0.1)' }}>
                  <h4 className="font-semibold mb-2" style={{ color: '#2C3E50' }}>Seller Info</h4>
                  <div 
                    onClick={() => item.seller?.username && onViewProfile?.(item.seller.username)}
                    className={`flex items-center gap-2 mb-2 ${
                      item.seller?.username && onViewProfile 
                        ? 'cursor-pointer hover:bg-gray-50 p-1 -m-1 rounded-lg transition-colors' 
                        : ''
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(74, 111, 165, 0.1)' }}>
                      <span className="text-xs font-medium" style={{ color: '#4A6FA5' }}>
                        {(item.seller?.username || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm" style={{ color: '#2C3E50' }}>
                        {item.seller?.username || 'Anonymous'}
                        {item.seller?.username && onViewProfile && (
                          <span className="text-xs font-normal ml-1" style={{ color: '#4A6FA5' }}>View Profile →</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
                        <MapPin className="h-2 w-2" />
                        <span>{item.seller?.zip_code ? `${item.seller.zip_code} area` : 'Local area'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Location Map */}
                  {item.seller?.zip_code && (
                    <div className="space-y-2 mt-4">
                      <p className="text-sm font-medium" style={{ color: '#4A6FA5' }}>Pickup Area</p>
                      <div className="w-full h-48 overflow-hidden rounded-lg border border-gray-200">
                        <LocationMap zipCode={item.seller.zip_code} />
                      </div>
                    </div>
                  )}
                </div>
            </div>

            {/* Enhanced Offer History Section */}
            {showMessages && negotiation && (
              <div className="lg:col-span-2 mt-6 px-4 lg:px-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" style={{ color: '#4A6FA5' }} />
                      Negotiation History
                      {isConnectedToRealtime && (
                        <Badge className="bg-green-100 text-green-800">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                          Live
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingMessages ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading negotiation history...</span>
                      </div>
                    ) : offers.length > 0 ? (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {offers.map((offer, index) => (
                          <OfferCard 
                            key={offer.id} 
                            offer={offer} 
                            isLatest={index === offers.length - 1}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-sm lg:text-base">No offers yet. Start the negotiation by making an offer!</p>
                      </div>
                    )}
                    
                    {realtimeError && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">
                          ⚠️ {realtimeError}. You may need to refresh the page to see the latest updates.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #F5F0E8 0%, #FAF7F2 50%, #E8DDD4 100%)', backdropFilter: 'blur(15px)', boxShadow: '0 20px 60px rgba(74, 111, 165, 0.3)' }}>
              <h3 className="text-xl font-bold mb-6" style={{ color: '#2C3E50' }}>Make an Offer</h3>
              
              <div className="space-y-4">
                {latestOffer && latestOffer.agent_generated && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Bot className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800 mb-1">Responding to AI Agent Offer</h4>
                        <p className="text-sm text-blue-700 mb-2">
                          The seller's AI agent offered ${latestOffer.price?.toFixed(2)}
                          {latestOffer.agent_decisions?.[0] && (
                            <span className="ml-1">
                              (Confidence: {Math.round((latestOffer.agent_decisions[0].confidence_score || 0) * 100)}%)
                            </span>
                          )}
                        </p>
                        {latestOffer.agent_decisions?.[0]?.reasoning && (
                          <p className="text-xs text-blue-600 italic">
                            "{latestOffer.agent_decisions[0].reasoning}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#2C3E50' }}>
                    {negotiation ? 'Counter Offer Amount' : 'Offer Amount'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg" style={{ color: '#4A6FA5' }}>$</span>
                    <input
                      type="number"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 text-lg [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{ 
                        borderColor: 'rgba(74, 111, 165, 0.3)', 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                        color: '#2C3E50',
                        MozAppearance: 'textfield'
                      } as React.CSSProperties}
                      placeholder={latestOffer ? latestOffer.price?.toFixed(2) || '0.00' : '0.00'}
                      step="0.01"
                    />
                  </div>
                  {latestOffer && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setOfferAmount((latestOffer.price! * 0.95).toFixed(2))}
                        className="text-xs"
                      >
                        -5% (${(latestOffer.price! * 0.95).toFixed(2)})
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setOfferAmount((latestOffer.price! * 1.05).toFixed(2))}
                        className="text-xs"
                      >
                        +5% (${(latestOffer.price! * 1.05).toFixed(2)})
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#2C3E50' }}>
                    Message (optional)
                  </label>
                  <textarea
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    className="w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ 
                      borderColor: 'rgba(74, 111, 165, 0.3)', 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                      color: '#2C3E50'
                    } as React.CSSProperties}
                    rows={3}
                    placeholder="Add a message to the seller..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={() => setShowOfferForm(false)} 
                    variant="outline" 
                    className="flex-1 text-white hover:opacity-90"
                    style={{ borderColor: '#4A6FA5', backgroundColor: 'transparent', color: '#4A6FA5' }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={negotiation ? () => {
                      const amount = parseFloat(offerAmount)
                      if (isNaN(amount) || amount <= 0) {
                        alert('Please enter a valid offer amount')
                        return
                      }
                      handleCounterOffer(amount, offerMessage)
                      setShowOfferForm(false)
                      setOfferAmount('')
                      setOfferMessage('')
                    } : handleMakeOffer}
                    className="flex-1 text-white hover:opacity-90"
                    style={{ backgroundColor: '#4A6FA5' }}
                  >
                    {negotiation ? 'Submit Counter Offer' : 'Submit Offer'}
                  </Button>
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  )
}