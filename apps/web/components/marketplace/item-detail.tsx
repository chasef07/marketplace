'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Heart, MapPin, User, DollarSign, MessageSquare, ChevronDown, ChevronUp, Edit, Save, X } from "lucide-react"
import { apiClient, ImageData } from "@/lib/api-client-new"
import { FURNITURE_BLUR_DATA_URL } from "@/lib/blur-data"
import Image from "next/image"
import { ItemDetailSkeleton } from "@/components/ui/skeleton"
import { ImageCarousel } from "@/components/ui/ImageCarousel"

// Lazy load the map component
const SimpleLocationMap = dynamic(() => import('@/components/maps/simple-location-map').then(mod => ({ default: mod.SimpleLocationMap })), {
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

interface Offer {
  id: number
  negotiation_id: number
  offer_type: string
  price: number
  message: string | null
  round_number: number
  created_at: string
  is_counter_offer: boolean
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
  
  useEffect(() => {
    fetchItem()
  }, [itemId])
  
  useEffect(() => {
    if (userId) {
      fetchNegotiation()
    }
  }, [itemId, userId])

  const fetchItem = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getItem(itemId)
      setItem(response)
    } catch (err) {
      setError('Failed to load item details')
    } finally {
      setLoading(false)
    }
  }

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

  const fetchOffers = useCallback(async () => {
    if (!negotiation) return
    
    try {
      setLoadingMessages(true)
      const offersData = await apiClient.getNegotiationOffers(negotiation.id)
      setOffers(offersData || [])
    } catch (err) {
      console.error('Failed to fetch offers:', err)
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

  const isOwnItem = useMemo(() => userId && item && userId === item.seller_id, [userId, item?.seller_id])

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
              <p className="text-3xl font-bold mb-2" style={{ color: '#7CB342' }}>${item.starting_price}</p>
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
                    <p className="text-4xl font-bold" style={{ color: '#7CB342' }}>${item.starting_price}</p>
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
                        Make Offer
                      </Button>
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
                        <SimpleLocationMap zipCode={item.seller.zip_code} />
                      </div>
                    </div>
                  )}
                </div>
            </div>


          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #F5F0E8 0%, #FAF7F2 50%, #E8DDD4 100%)', backdropFilter: 'blur(15px)', boxShadow: '0 20px 60px rgba(74, 111, 165, 0.3)' }}>
              <h3 className="text-xl font-bold mb-6" style={{ color: '#2C3E50' }}>Make an Offer</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#2C3E50' }}>
                    Offer Amount
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
                        focusRingColor: '#4A6FA5',
                        MozAppearance: 'textfield'
                      }}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
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
                      color: '#2C3E50',
                      focusRingColor: '#4A6FA5'
                    }}
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
                    onClick={handleMakeOffer}
                    className="flex-1 text-white hover:opacity-90"
                    style={{ backgroundColor: '#4A6FA5' }}
                  >
                    Submit Offer
                  </Button>
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  )
}