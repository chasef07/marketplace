'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Heart, MapPin, Clock, User, DollarSign, MessageCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface SellerInfo {
  id: number
  username: string
}

interface FurnitureItem {
  id: number
  name: string
  description: string
  starting_price: string
  min_price: string
  condition: string
  furniture_type: string
  image_filename: string | null
  seller_id: number
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
  id: number
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
  onMakeOffer?: (itemId: number, offer: number, message: string) => void
}

export function ItemDetail({ itemId, user, onBack, onMakeOffer }: ItemDetailProps) {
  const [item, setItem] = useState<FurnitureItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerMessage, setOfferMessage] = useState('')

  useEffect(() => {
    fetchItem()
  }, [itemId])

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

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const created = new Date(timestamp)
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
    
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600 bg-green-50'
      case 'good': return 'text-blue-600 bg-blue-50'  
      case 'fair': return 'text-yellow-600 bg-yellow-50'
      case 'poor': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const handleMakeOffer = async () => {
    if (!onMakeOffer || !offerAmount) return
    
    const amount = parseFloat(offerAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid offer amount')
      return
    }

    if (item && amount < parseFloat(item.min_price)) {
      alert(`Offer must be at least $${item.min_price}`)
      return
    }

    try {
      await onMakeOffer(itemId, amount, offerMessage)
      setShowOfferForm(false)
      setOfferAmount('')
      setOfferMessage('')
    } catch (err) {
      alert('Failed to submit offer')
    }
  }

  const isOwnItem = user && item && user.id === item.seller_id

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading item details...</div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Item not found'}</p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">{item.name}</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Image */}
          <div className="space-y-4">
            <Card className="bg-white">
              <CardContent className="p-0 bg-white">
                <div className="bg-gray-100 h-96 flex items-center justify-center rounded-lg overflow-hidden">
                  {item.image_filename ? (
                    <img 
                      src={`http://localhost:8000/static/uploads/${item.image_filename}`}
                      alt={item.name}
                      className="w-full h-full object-cover"
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
                    <p className="text-3xl font-bold text-gray-900">${item.starting_price}</p>
                    {parseFloat(item.min_price) < parseFloat(item.starting_price) && (
                      <p className="text-sm text-gray-500">Minimum acceptable: ${item.min_price}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>

                {/* Condition */}
                <div className="mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getConditionColor(item.condition)}`}>
                    {item.condition} condition
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!isOwnItem && user && (
                    <>
                      <Button 
                        onClick={() => setShowOfferForm(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        size="lg"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Make an Offer
                      </Button>
                      <Button variant="outline" className="w-full" size="lg">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message Seller
                      </Button>
                    </>
                  )}
                  {!user && (
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                      Sign in to Make Offer
                    </Button>
                  )}
                  {isOwnItem && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 text-sm">This is your listing</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card className="bg-white">
              <CardContent className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{item.description || 'No description provided.'}</p>
              </CardContent>
            </Card>

            {/* Details */}
            <Card className="bg-white">
              <CardContent className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-700 font-medium">Category:</span>
                    <p className="font-semibold text-gray-900 capitalize">{item.furniture_type.replace('_', ' ')}</p>
                  </div>
                  {item.dimensions && (
                    <div>
                      <span className="text-gray-700 font-medium">Dimensions:</span>
                      <p className="font-semibold text-gray-900">{item.dimensions}</p>
                    </div>
                  )}
                  {item.material && (
                    <div>
                      <span className="text-gray-700 font-medium">Material:</span>
                      <p className="font-semibold text-gray-900">{item.material}</p>
                    </div>
                  )}
                  {item.brand && (
                    <div>
                      <span className="text-gray-700 font-medium">Brand:</span>
                      <p className="font-semibold text-gray-900">{item.brand}</p>
                    </div>
                  )}
                  {item.color && (
                    <div>
                      <span className="text-gray-700 font-medium">Color:</span>
                      <p className="font-semibold text-gray-900">{item.color}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-700 font-medium">Posted:</span>
                    <p className="font-semibold text-gray-900">{formatTimeAgo(item.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card className="bg-white">
              <CardContent className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Seller Information</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {(item.seller?.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.seller?.username || 'Anonymous'}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="h-3 w-3" />
                      <span>Local pickup</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white">
            <CardContent className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Make an Offer</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Offer Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      placeholder="0.00"
                      min={item.min_price}
                      step="0.01"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum: ${item.min_price}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message (optional)
                  </label>
                  <textarea
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    rows={3}
                    placeholder="Add a message to the seller..."
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setShowOfferForm(false)} 
                    variant="outline" 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleMakeOffer}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
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