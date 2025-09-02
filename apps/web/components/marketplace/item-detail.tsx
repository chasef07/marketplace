'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, MapPin, User, DollarSign, Edit, Save, X, AlertCircle } from "lucide-react"
import OfferConfirmationPopup from "@/components/buyer/OfferConfirmationPopup"
import { apiClient, ImageData } from "@/lib/api-client-new"
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


interface ItemDetailProps {
  itemId: number
  user: User | null
  onBack: () => void
  onSignInClick?: () => void
  onViewProfile?: (username: string) => void
}

export function ItemDetail({ itemId, user, onBack, onSignInClick, onViewProfile }: ItemDetailProps) {
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
        await response.json()
        
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
      <div className="min-h-screen bg-aurora-dreams bg-aurora-animated flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error || 'Item not found'}</p>
          </div>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-aurora-dreams bg-aurora-animated">
      {/* Clean Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
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

      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="grid lg:grid-cols-5 gap-4 sm:gap-6 max-w-7xl mx-auto">
          {/* Image Carousel - Takes up 3 columns on large screens */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
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
                        className="w-full"
                      />
                    )
                  } else {
                    return (
                      <div className="flex items-center justify-center bg-slate-100 rounded-lg" style={{ minHeight: '300px' }}>
                        <div className="text-8xl">🪑</div>
                      </div>
                    )
                  }
                })()}
              </CardContent>
            </Card>
            
            {/* Item Title & Basic Info - Mobile Only */}
            <div className="lg:hidden mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold mb-3 text-slate-800 leading-tight">{item.name}</h1>
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl sm:text-4xl font-bold text-green-600">${parseFloat(item.starting_price).toFixed(2)}</div>
              </div>
              <p className="text-sm text-slate-500">Listed {formatTimeAgo(item.created_at)}</p>
            </div>

            {/* Description - Under Photo */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-800">Description</h3>
                {isEditing ? (
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    placeholder="Enter item description..."
                  />
                ) : (
                  <div className="space-y-3">
                    <p className="text-slate-600 leading-relaxed">
                      {item.description || 'No description provided.'}
                    </p>
                    {item.dimensions && (
                      <>
                        <Separator />
                        <div className="text-sm">
                          <Label className="font-medium text-slate-700">Dimensions:</Label>
                          <p className="text-slate-600 mt-1">{item.dimensions}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Details & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price and Actions Card */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                {/* Title - Desktop Only */}
                <div className="hidden lg:block mb-6">
                  <h1 className="text-2xl font-bold mb-2 text-slate-800">{item.name}</h1>
                  <p className="text-sm text-slate-500">Listed {formatTimeAgo(item.created_at)}</p>
                </div>
                
                {/* Price */}
                <div className="mb-6">
                  {isEditing ? (
                    <div>
                      <Label htmlFor="price-input" className="text-sm font-medium text-slate-700 mb-2 block">
                        Starting Price
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-2xl font-bold text-slate-900">$</span>
                        <Input
                          id="price-input"
                          type="number"
                          value={editForm.starting_price}
                          onChange={(e) => setEditForm(prev => ({ ...prev, starting_price: e.target.value }))}
                          className="text-2xl font-bold pl-8 h-16"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="text-4xl font-bold text-green-600">${parseFloat(item.starting_price).toFixed(2)}</div>
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
                        className="w-full bg-slate-700 hover:bg-slate-800 text-white font-semibold shadow-sm hover:shadow-md transition-all duration-200 ease-in-out border border-slate-600 hover:border-slate-700"
                        size="default"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Make an Offer
                      </Button>
                      
                    </>
                  )}
                  {!user && (
                    <Button 
                      onClick={onSignInClick}
                      className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold shadow-sm hover:shadow-md transition-all duration-200 ease-in-out border border-slate-500 hover:border-slate-600" 
                      size="default"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Sign in to Make Offer
                    </Button>
                  )}
                  {isOwnItem && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <p className="text-sm font-medium mb-3 text-blue-800">This is your listing</p>
                        
                        {isEditing && (
                          <div className="space-y-2">
                            <Label htmlFor="status-select" className="text-sm font-medium text-slate-700">
                              Listing Status
                            </Label>
                            <Select
                              value={editForm.item_status}
                              onValueChange={(value: 'active' | 'paused' | 'sold' | 'archived') => 
                                setEditForm(prev => ({ ...prev, item_status: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active (Available for sale)</SelectItem>
                                <SelectItem value="paused">Paused (Temporarily unavailable)</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Separator />
                
                {/* Seller Info */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-800">Seller Info</h4>
                  <div 
                    onClick={() => item.seller?.username && onViewProfile?.(item.seller.username)}
                    className={`flex items-center gap-3 ${
                      item.seller?.username && onViewProfile 
                        ? 'cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded-lg transition-colors' 
                        : ''
                    }`}
                  >
                    <Avatar>
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {(item.seller?.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">
                        {item.seller?.username || 'Anonymous'}
                        {item.seller?.username && onViewProfile && (
                          <span className="text-xs font-normal ml-1 text-blue-600">View Profile →</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        <span>{item.seller?.zip_code ? `${item.seller.zip_code} area` : 'Local area'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pickup Area */}
                  {item.seller?.zip_code && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-blue-700">Pickup Area</Label>
                      <div className="bg-slate-50 rounded-lg p-4 border">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-slate-700">{item.seller.zip_code} area</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Contact seller for specific pickup location
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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
              Submit your best offer for &quot;{item?.name}&quot;
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
                <p className="text-sm text-slate-500">
                  Asking price: ${parseFloat(item.starting_price).toFixed(2)}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="offer-message" className="text-sm font-medium text-slate-700">
                Message (Optional)
              </Label>
              <Textarea
                id="offer-message"
                placeholder="Add a message to the seller..."
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                rows={3}
                className="resize-none"
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
                className="flex-1 hover:bg-slate-50 transition-colors duration-200"
                disabled={isSubmittingOffer}
              >
                Cancel
              </Button>
              <Button
                onClick={handleMakeOffer}
                disabled={!offerPrice || isSubmittingOffer}
                className="flex-1 bg-slate-700 hover:bg-slate-800 text-white font-semibold shadow-sm hover:shadow-md transition-all duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed border border-slate-600 hover:border-slate-700"
              >
                {isSubmittingOffer ? (
                  <span className="flex items-center">
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </span>
                ) : (
                  'Submit Offer'
                )}
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
      />

      {/* Offer form completely moved to profile page */}
    </div>
  )
}