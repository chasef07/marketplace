'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from "@/components/ui/card"
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
  condition: string
  furniture_type: string
  image_filename: string | null // Backward compatibility
  images?: ImageData[] // New multiple images support
  seller_id: string
  seller?: SellerInfo
  created_at: string
  updated_at: string
  is_available: boolean
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
  const [editForm, setEditForm] = useState({
    description: '',
    condition: '',
    starting_price: '',
    is_available: true
  })
  const [saveLoading, setSaveLoading] = useState(false)

  useEffect(() => {
    fetchItem()
    if (user) {
      fetchNegotiation()
    }
  }, [itemId, user])

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

  const fetchNegotiation = async () => {
    if (!user) return
    
    try {
      const negotiations = await apiClient.getMyNegotiations()
      const itemNegotiation = negotiations?.find((neg: Negotiation) => 
        neg.item_id === itemId && neg.buyer_id === user.id
      )
      setNegotiation(itemNegotiation || null)
    } catch (err) {
      console.error('Failed to fetch negotiation:', err)
    }
  }

  const fetchOffers = async () => {
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
  }

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

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600 bg-green-50'
      case 'good': return 'text-blue-600 bg-blue-50'  
      case 'fair': return 'text-yellow-600 bg-yellow-50'
      case 'poor': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-white border'
    }
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
      // Refresh negotiation data after making an offer
      await fetchNegotiation()
    } catch (err) {
      alert('Failed to submit offer')
    }
  }

  const startEditing = () => {
    if (!item) return
    setEditForm({
      description: item.description || '',
      condition: item.condition,
      starting_price: item.starting_price,
      is_available: item.is_available
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditForm({
      description: '',
      condition: '',
      starting_price: '',
      is_available: true
    })
  }

  const saveChanges = async () => {
    if (!item) return

    const updates: Partial<{
      description: string;
      condition: string;
      starting_price: number;
      is_available: boolean;
    }> = {}
    
    if (editForm.description !== item.description) {
      updates.description = editForm.description
    }
    if (editForm.condition !== item.condition) {
      updates.condition = editForm.condition
    }
    if (parseFloat(editForm.starting_price) !== parseFloat(item.starting_price)) {
      updates.starting_price = parseFloat(editForm.starting_price)
    }
    if (editForm.is_available !== item.is_available) {
      updates.is_available = editForm.is_available
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

  const isOwnItem = user && item && user.id === item.seller_id

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
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
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

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Image Carousel - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="overflow-hidden shadow-lg">
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
                      className="h-96 lg:h-[500px]"
                    />
                  )
                } else {
                  return (
                    <div className="h-96 lg:h-[500px] flex items-center justify-center bg-gray-100">
                      <div className="text-8xl">🪑</div>
                    </div>
                  )
                }
              })()}
            </Card>
            
            {/* Item Title & Basic Info - Mobile Only */}
            <div className="lg:hidden">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{item.name}</h1>
              <p className="text-4xl font-bold text-green-600 mb-4">${item.starting_price}</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getConditionColor(item.condition)}`}>
                {item.condition} condition
              </span>
            </div>
          </div>

          {/* Sticky Sidebar - Details & Actions */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            {/* Price and Actions Card */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                {/* Title - Desktop Only */}
                <div className="hidden lg:block mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.name}</h1>
                  <p className="text-sm text-gray-600">Listed {formatTimeAgo(item.created_at)}</p>
                </div>
                
                {/* Price */}
                <div className="mb-6">
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
                    <p className="text-4xl font-bold text-green-600">${item.starting_price}</p>
                  )}
                </div>

                {/* Condition */}
                <div className="mb-6">
                  {isEditing ? (
                    <select
                      value={editForm.condition}
                      onChange={(e) => setEditForm(prev => ({ ...prev, condition: e.target.value }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"
                    >
                      <option value="excellent">Excellent condition</option>
                      <option value="good">Good condition</option>
                      <option value="fair">Fair condition</option>
                      <option value="poor">Poor condition</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getConditionColor(item.condition)}`}>
                      {item.condition} condition
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                  {!isOwnItem && user && (
                    <>
                      {/* Quick Offer Buttons */}
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          onClick={() => {
                            setOfferAmount(item.starting_price)
                            setShowOfferForm(true)
                          }}
                          variant="outline"
                          className="border-green-600 text-green-600 hover:bg-green-50 font-medium"
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Ask ${item.starting_price}
                        </Button>
                        <Button 
                          onClick={() => {
                            const eightyPercent = Math.round(parseFloat(item.starting_price) * 0.8)
                            setOfferAmount(eightyPercent.toString())
                            setShowOfferForm(true)
                          }}
                          variant="outline"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50 font-medium"
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Offer ${Math.round(parseFloat(item.starting_price) * 0.8)}
                        </Button>
                      </div>
                      
                      {/* Custom Offer Button */}
                      <Button 
                        onClick={() => setShowOfferForm(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        size="lg"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {negotiation ? 'Make Another Offer' : 'Make Custom Offer'}
                      </Button>
                      
                      {negotiation && (
                        <Button 
                          onClick={toggleMessages}
                          variant="outline"
                          className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                          size="lg"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          View Messages
                          {showMessages ? (
                            <ChevronUp className="h-4 w-4 ml-2" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-2" />
                          )}
                        </Button>
                      )}
                    </>
                  )}
                  {!user && (
                    <Button 
                      onClick={onSignInClick}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium" 
                      size="lg"
                    >
                      Sign in to Make Offer
                    </Button>
                  )}
                  {isOwnItem && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">This is your listing</p>
                      
                      {isEditing && (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editForm.is_available}
                            onChange={(e) => setEditForm(prev => ({ ...prev, is_available: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">Item is available for sale</span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Message History */}
            {negotiation && showMessages && (
              <Card className="shadow-lg border-0">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Message History</h3>
                  {loadingMessages ? (
                    <div className="text-center py-4">
                      <div style={{ color: '#6B5A47' }}>Loading messages...</div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {offers.length > 0 ? (
                        offers.map((offer) => (
                          <div key={offer.id} className={`flex ${offer.offer_type === 'buyer' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-xs px-3 py-2 rounded-lg ${
                              offer.offer_type === 'buyer' 
                                ? 'bg-white border text-gray-900' 
                                : 'bg-blue-600 text-white'
                            }`}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-medium">
                                  {offer.offer_type === 'buyer' ? 'You' : 'Seller'}
                                </span>
                                <span className={offer.offer_type === 'buyer' ? 'text-gray-500' : 'text-blue-100'}>
                                  ${offer.price}
                                </span>
                              </div>
                              {offer.message && (
                                <p className="text-sm">{offer.message}</p>
                              )}
                              <p className={`text-xs mt-1 ${
                                offer.offer_type === 'buyer' ? 'text-gray-500' : 'text-blue-100'
                              }`}>
                                {formatTimeAgo(offer.created_at)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-center py-4" style={{ color: '#6B5A47' }}>
                          No messages yet
                        </p>
                      )}
                    </div>
                  )}
                  
                  {negotiation && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          negotiation.status === 'active' ? 'text-blue-600 bg-blue-100' :
                          negotiation.status === 'deal_pending' ? 'text-green-600 bg-green-100' :
                          negotiation.status === 'completed' ? 'text-gray-600 bg-white border' :
                          'text-red-600 bg-red-100'
                        }`}>
                          {negotiation.status.replace('_', ' ')}
                        </span>
                        <span className="text-gray-500">
                          Round {negotiation.round_number}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        </div>
        
        {/* Additional Info Cards - Full Width Below */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {/* Description */}
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Description</h3>
              {isEditing ? (
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                  rows={6}
                  placeholder="Enter item description..."
                />
              ) : (
                <p className="whitespace-pre-wrap text-gray-600 leading-relaxed">
                  {item.description || 'No description provided.'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Details & Seller Info Combined */}
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Item Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <span className="font-medium text-gray-500">Category</span>
                  <p className="font-semibold capitalize text-gray-900">{item.furniture_type.replace('_', ' ')}</p>
                </div>
                {item.style && (
                  <div>
                    <span className="font-medium text-gray-500">Style</span>
                    <p className="font-semibold capitalize text-gray-900">{item.style}</p>
                  </div>
                )}
                {item.dimensions && (
                  <div>
                    <span className="font-medium text-gray-500">Dimensions</span>
                    <p className="font-semibold text-gray-900">{item.dimensions}</p>
                  </div>
                )}
                {item.material && (
                  <div>
                    <span className="font-medium text-gray-500">Material</span>
                    <p className="font-semibold text-gray-900">{item.material}</p>
                  </div>
                )}
                {item.brand && (
                  <div>
                    <span className="font-medium text-gray-500">Brand</span>
                    <p className="font-semibold text-gray-900">{item.brand}</p>
                  </div>
                )}
                {item.color && (
                  <div>
                    <span className="font-medium text-gray-500">Color</span>
                    <p className="font-semibold text-gray-900">{item.color}</p>
                  </div>
                )}
              </div>
              
              {/* Seller Info */}
              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Seller Information</h4>
                <div 
                  onClick={() => item.seller?.username && onViewProfile?.(item.seller.username)}
                  className={`flex items-center gap-3 mb-4 ${
                    item.seller?.username && onViewProfile 
                      ? 'cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded-lg transition-colors' 
                      : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {(item.seller?.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      {item.seller?.username || 'Anonymous'}
                      {item.seller?.username && onViewProfile && (
                        <span className="text-xs text-blue-600 font-normal">View Profile →</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="h-3 w-3" />
                      <span>{item.seller?.zip_code ? `${item.seller.zip_code} area` : 'Local area'}</span>
                    </div>
                  </div>
                  {item.seller?.username && onViewProfile && (
                    <User className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                
                {/* Location Map */}
                {item.seller?.zip_code && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Pickup/Delivery Area</p>
                    <SimpleLocationMap zipCode={item.seller.zip_code} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white shadow-2xl">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-6 text-gray-900">Make an Offer</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Offer Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">$</span>
                    <input
                      type="number"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 text-lg"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Message (optional)
                  </label>
                  <textarea
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    rows={3}
                    placeholder="Add a message to the seller..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={() => setShowOfferForm(false)} 
                    variant="outline" 
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleMakeOffer}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Submit Offer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}