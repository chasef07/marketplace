'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ArrowLeft, MapPin, User, DollarSign, Edit, Save, X, AlertCircle } from "lucide-react"
import OfferConfirmationPopup from "@/components/buyer/OfferConfirmationPopup"
import { apiClient, ImageData } from "@/lib/api-client-new"
import { FURNITURE_BLUR_DATA_URL } from "@/lib/blur-data"
import { ItemDetailSkeleton } from "@/components/ui/skeleton"
import { ImageCarousel } from "@/components/ui/ImageCarousel"


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
  onSignInClick?: () => void
  onViewProfile?: (username: string) => void
}

export function ItemDetail({ itemId, user, onBack, onSignInClick, onViewProfile }: ItemDetailProps) {
  const router = useRouter()
  const [item, setItem] = useState<FurnitureItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Make Offer overlay state
  const [showOfferOverlay, setShowOfferOverlay] = useState(false)
  const [offerPrice, setOfferPrice] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false)
  const [offerError, setOfferError] = useState<string | null>(null)
  
  // Confirmation popup state
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false)
  const [submittedOfferDetails, setSubmittedOfferDetails] = useState<{
    itemName: string
    price: number
    sellerUsername?: string
    isAgentEnabled?: boolean
  } | null>(null)
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
      console.log('🔍 Fetched item data:', {
        id: response.id,
        name: response.name,
        item_status: response.item_status,
        seller_id: response.seller_id
      })
      setItem(response)
    } catch (err) {
      setError('Failed to load item details')
    } finally {
      setLoading(false)
    }
  }, [itemId])

  // Removed: fetchNegotiation - moved to profile page

  useEffect(() => {
    fetchItem()
  }, [itemId, fetchItem])
  
  // Removed: fetchNegotiation useEffect - moved to profile page

  // Removed: realtime subscriptions - not needed on item detail page since buyer interaction moved to profile

  // Make Offer functionality
  const handleMakeOffer = useCallback(async () => {
    if (!user || !item || !offerPrice) return

    setIsSubmittingOffer(true)
    setOfferError(null)
    
    try {
      const price = parseFloat(offerPrice)
      if (isNaN(price) || price <= 0) {
        setOfferError('Please enter a valid price')
        return
      }

      // Debug: Log item status before API call
      console.log('🔍 Item status before making offer:', {
        itemId: item.id,
        itemStatus: item.item_status,
        itemName: item.name
      })

      // Use the correct API endpoint for creating offers
      const headers = await apiClient.getAuthHeaders(true)
      const response = await fetch(`/api/negotiations/items/${item.id}/offers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          price: price,
          message: offerMessage || null
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Close the offer overlay
        setShowOfferOverlay(false)
        setOfferPrice('')
        setOfferMessage('')
        setOfferError(null)
        
        // Set up confirmation popup details
        setSubmittedOfferDetails({
          itemName: item.name,
          price: price,
          sellerUsername: item.seller?.username,
          isAgentEnabled: item.agent_enabled
        })
        
        // Show beautiful confirmation popup
        setShowConfirmationPopup(true)
      } else {
        const errorData = await response.json()
        setOfferError(errorData.error || 'Failed to submit offer. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting offer:', error)
      setOfferError('Failed to submit offer. Please try again.')
    } finally {
      setIsSubmittingOffer(false)
    }
  }, [user, item, offerPrice, offerMessage])

  // Removed: fetchOffers - moved to profile page

  // Removed: toggleMessages - moved to profile page

  // Removed: handleAcceptOffer - moved to profile page

  // Removed: handleCounterOffer - moved to profile page

  // Removed: handleDeclineOffer - moved to profile page

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


  // Removed: handleMakeOffer - moved to profile page

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
  // Removed: isBuyer - not needed for item display only
  // Removed: latestOffer - moved to profile page
  // Removed: needsResponse - moved to profile page

  // Removed: OfferCard and RealtimeStatus components - moved to profile page

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
                      {/* Make Offer Button - Opens Overlay */}
                      <Button 
                        onClick={() => setShowOfferOverlay(true)}
                        className="w-full font-medium text-white hover:opacity-90"
                        style={{ backgroundColor: '#4A6FA5' }}
                        size="lg"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Make Offer
                      </Button>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600">
                          View and manage your offers in your 
                          <Button 
                            variant="link" 
                            className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-800"
                            onClick={() => window.location.href = `/profile/${user.username}`}
                          >
                            profile page
                          </Button>
                        </p>
                      </div>
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

            {/* Offer history section completely moved to profile page */}

          </div>
        </div>
      </div>

      {/* Make Offer Overlay */}
      <Dialog open={showOfferOverlay} onOpenChange={setShowOfferOverlay}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Make an Offer</DialogTitle>
            <DialogDescription>
              Submit your best offer for "{item?.name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Error Display */}
            {offerError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-800 text-sm font-medium">Error</p>
                  <p className="text-red-700 text-sm">{offerError}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="offer-price" className="text-sm font-medium text-gray-700">
                Your Offer ($)
              </label>
              <Input
                id="offer-price"
                type="number"
                placeholder="Enter your offer amount"
                value={offerPrice}
                onChange={(e) => {
                  setOfferPrice(e.target.value)
                  if (offerError) setOfferError(null) // Clear error when user types
                }}
                min="0"
                step="0.01"
                className={offerError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""}
              />
              {item && (
                <p className="text-sm text-gray-500">
                  Asking price: ${item.starting_price.toFixed(2)}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="offer-message" className="text-sm font-medium text-gray-700">
                Message (Optional)
              </label>
              <textarea
                id="offer-message"
                placeholder="Add a message to the seller..."
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowOfferOverlay(false)
                  setOfferPrice('')
                  setOfferMessage('')
                  setOfferError(null)
                }}
                className="flex-1"
                disabled={isSubmittingOffer}
              >
                Cancel
              </Button>
              <Button
                onClick={handleMakeOffer}
                disabled={!offerPrice || isSubmittingOffer}
                className="flex-1"
                style={{ backgroundColor: '#4A6FA5' }}
              >
                {isSubmittingOffer ? 'Submitting...' : 'Submit Offer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offer Confirmation Popup */}
      <OfferConfirmationPopup
        isVisible={showConfirmationPopup}
        onClose={() => {
          setShowConfirmationPopup(false)
          setSubmittedOfferDetails(null)
          // Navigate back to marketplace after confirmation
          if (onBack) {
            onBack()
          }
        }}
        offerDetails={submittedOfferDetails || undefined}
        autoCloseDelay={5000}
      />

      {/* Offer form completely moved to profile page */}
    </div>
  )
}