'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Heart, MapPin, User, DollarSign, MessageSquare, ChevronDown, ChevronUp, Edit, Save, X } from "lucide-react"
import { apiClient } from "@/lib/api-client-new"
import { FURNITURE_BLUR_DATA_URL } from "@/lib/blur-data"
import Image from "next/image"
import { ItemDetailSkeleton } from "@/components/ui/skeleton"

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
  image_filename: string | null
  seller_id: string
  seller?: SellerInfo
  created_at: string
  updated_at: string
  is_available: boolean
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
}

export function ItemDetail({ itemId, user, onBack, onMakeOffer }: ItemDetailProps) {
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
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F7F3E9 0%, #E8DDD4 50%, #DDD1C7 100%)' }}>
      {/* Header */}
      <header className="backdrop-blur-md border-b sticky top-0 z-50" style={{ background: 'rgba(247, 243, 233, 0.9)', borderColor: 'rgba(139, 69, 19, 0.1)' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={onBack} variant="outline" size="sm" style={{ borderColor: '#8B4513', color: '#8B4513' }}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-xl font-semibold" style={{ color: '#3C2415' }}>{item.name}</h1>
            </div>
            
            {isOwnItem && (
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button 
                      onClick={cancelEditing} 
                      variant="outline" 
                      size="sm"
                      style={{ borderColor: '#8B4513', color: '#8B4513' }}
                      disabled={saveLoading}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={saveChanges} 
                      size="sm"
                      style={{ background: '#8B4513', color: '#F7F3E9' }}
                      disabled={saveLoading}
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
                    style={{ borderColor: '#8B4513', color: '#8B4513' }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Image */}
          <div className="space-y-4">
            <Card className="bg-white">
              <CardContent className="p-0 bg-white">
                <div className="bg-white border h-96 flex items-center justify-center rounded-lg overflow-hidden relative">
                  {item.image_filename ? (
                    <Image 
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/furniture-images/${item.image_filename}`}
                      alt={item.name}
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
                      placeholder="blur"
                      blurDataURL={FURNITURE_BLUR_DATA_URL}
                      quality={90}
                    />
                  ) : (
                    <div className="text-8xl">🪑</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Price and Actions */}
            <Card className="bg-white">
              <CardContent className="p-6 bg-white">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    {isEditing ? (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-2xl font-bold" style={{ color: '#3C2415' }}>$</span>
                        <input
                          type="number"
                          value={editForm.starting_price}
                          onChange={(e) => setEditForm(prev => ({ ...prev, starting_price: e.target.value }))}
                          className="text-3xl font-bold pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          style={{ color: '#3C2415' }}
                          step="0.01"
                          min="0"
                        />
                      </div>
                    ) : (
                      <p className="text-3xl font-bold" style={{ color: '#3C2415' }}>${item.starting_price}</p>
                    )}
                  </div>
                  {!isOwnItem && (
                    <Button variant="outline" size="sm" style={{ borderColor: '#8B4513', color: '#8B4513' }}>
                      <Heart className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Condition */}
                <div className="mb-4">
                  {isEditing ? (
                    <select
                      value={editForm.condition}
                      onChange={(e) => setEditForm(prev => ({ ...prev, condition: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      style={{ color: '#3C2415' }}
                    >
                      <option value="excellent">Excellent condition</option>
                      <option value="good">Good condition</option>
                      <option value="fair">Fair condition</option>
                      <option value="poor">Poor condition</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getConditionColor(item.condition)}`}>
                      {item.condition} condition
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!isOwnItem && user && (
                    <>
                      <Button 
                        onClick={() => setShowOfferForm(true)}
                        className="w-full hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #8B4513, #CD853F)', color: '#F7F3E9' }}
                        size="lg"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        {negotiation ? 'Make Another Offer' : 'Make an Offer'}
                      </Button>
                      
                      {negotiation && (
                        <Button 
                          onClick={toggleMessages}
                          variant="outline"
                          className="w-full"
                          style={{ borderColor: '#8B4513', color: '#8B4513' }}
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
                    <Button className="w-full hover:opacity-90" style={{ background: 'linear-gradient(135deg, #8B4513, #CD853F)', color: '#F7F3E9' }} size="lg">
                      Sign in to Make Offer
                    </Button>
                  )}
                  {isOwnItem && (
                    <div className="rounded-lg p-4 space-y-3" style={{ background: 'rgba(139, 69, 19, 0.1)', border: '1px solid rgba(139, 69, 19, 0.2)' }}>
                      <p className="text-sm" style={{ color: '#8B4513' }}>This is your listing</p>
                      
                      {isEditing && (
                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editForm.is_available}
                              onChange={(e) => setEditForm(prev => ({ ...prev, is_available: e.target.checked }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm" style={{ color: '#8B4513' }}>Item is available for sale</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Message History */}
            {negotiation && showMessages && (
              <Card className="bg-white">
                <CardContent className="p-6 bg-white">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: '#3C2415' }}>Message History</h3>
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

            {/* Description */}
            <Card className="bg-white">
              <CardContent className="p-6 bg-white">
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#3C2415' }}>Description</h3>
                {isEditing ? (
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    style={{ color: '#6B5A47' }}
                    rows={6}
                    placeholder="Enter item description..."
                  />
                ) : (
                  <p className="whitespace-pre-wrap" style={{ color: '#6B5A47' }}>{item.description || 'No description provided.'}</p>
                )}
              </CardContent>
            </Card>

            {/* Details */}
            <Card className="bg-white">
              <CardContent className="p-6 bg-white">
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#3C2415' }}>Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium" style={{ color: '#6B5A47' }}>Category:</span>
                    <p className="font-semibold capitalize" style={{ color: '#3C2415' }}>{item.furniture_type.replace('_', ' ')}</p>
                  </div>
                  {item.dimensions && (
                    <div>
                      <span className="font-medium" style={{ color: '#6B5A47' }}>Dimensions:</span>
                      <p className="font-semibold" style={{ color: '#3C2415' }}>{item.dimensions}</p>
                    </div>
                  )}
                  {item.material && (
                    <div>
                      <span className="font-medium" style={{ color: '#6B5A47' }}>Material:</span>
                      <p className="font-semibold" style={{ color: '#3C2415' }}>{item.material}</p>
                    </div>
                  )}
                  {item.brand && (
                    <div>
                      <span className="font-medium" style={{ color: '#6B5A47' }}>Brand:</span>
                      <p className="font-semibold" style={{ color: '#3C2415' }}>{item.brand}</p>
                    </div>
                  )}
                  {item.color && (
                    <div>
                      <span className="font-medium" style={{ color: '#6B5A47' }}>Color:</span>
                      <p className="font-semibold" style={{ color: '#3C2415' }}>{item.color}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium" style={{ color: '#6B5A47' }}>Posted:</span>
                    <p className="font-semibold" style={{ color: '#3C2415' }}>{formatTimeAgo(item.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card className="bg-white">
              <CardContent className="p-6 bg-white">
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#3C2415' }}>Seller Information</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(139, 69, 19, 0.1)' }}>
                    <span className="text-sm font-medium" style={{ color: '#8B4513' }}>
                      {(item.seller?.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: '#3C2415' }}>{item.seller?.username || 'Anonymous'}</p>
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#6B5A47' }}>
                      <MapPin className="h-3 w-3" />
                      <span>{item.seller?.zip_code ? `${item.seller.zip_code} area` : 'Local area'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Location Map */}
                {item.seller?.zip_code && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium" style={{ color: '#6B5A47' }}>Pickup/Delivery Area</p>
                    <SimpleLocationMap zipCode={item.seller.zip_code} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferForm && (
        <div className="fixed inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white">
            <CardContent className="p-6 bg-white">
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#3C2415' }}>Make an Offer</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#6B5A47' }}>
                    Offer Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: '#6B5A47' }}>$</span>
                    <input
                      type="number"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white"
                      style={{ borderColor: 'rgba(139, 69, 19, 0.2)', color: '#3C2415' }}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#6B5A47' }}>
                    Message (optional)
                  </label>
                  <textarea
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white"
                    style={{ borderColor: 'rgba(139, 69, 19, 0.2)', color: '#3C2415' }}
                    rows={3}
                    placeholder="Add a message to the seller..."
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setShowOfferForm(false)} 
                    variant="outline" 
                    className="flex-1"
                    style={{ borderColor: '#8B4513', color: '#8B4513' }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleMakeOffer}
                    className="flex-1 hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #8B4513, #CD853F)', color: '#F7F3E9' }}
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