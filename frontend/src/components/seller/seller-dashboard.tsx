'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, TrendingUp, MessageSquare, Eye, ArrowLeft, X, ChevronDown, ChevronUp } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface User {
  id: number
  username: string
  email: string
}

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
}

interface Negotiation {
  id: number
  item_id: number
  seller_id: number
  buyer_id: number
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

interface SellerDashboardProps {
  user: User
  onItemClick?: (itemId: number) => void
  onBackToMarketplace?: () => void
}

export function SellerDashboard({ user, onItemClick, onBackToMarketplace }: SellerDashboardProps) {
  const [items, setItems] = useState<FurnitureItem[]>([])
  const [negotiations, setNegotiations] = useState<Negotiation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'items' | 'offers'>('items')
  const [showCounterModal, setShowCounterModal] = useState(false)
  const [selectedNegotiation, setSelectedNegotiation] = useState<Negotiation | null>(null)
  const [counterAmount, setCounterAmount] = useState('')
  const [counterMessage, setCounterMessage] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [expandedNegotiations, setExpandedNegotiations] = useState<Set<number>>(new Set())
  const [negotiationOffers, setNegotiationOffers] = useState<Record<number, Offer[]>>({})

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const [itemsData, negotiationsData] = await Promise.all([
        apiClient.getMyItems(),
        apiClient.getMyNegotiations()
      ])
      
      setItems(itemsData || [])
      setNegotiations(negotiationsData || [])
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
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

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'  
      case 'fair': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-600 bg-blue-100'
      case 'deal_pending': return 'text-green-600 bg-green-100'
      case 'completed': return 'text-gray-600 bg-gray-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const handleAcceptOffer = async (negotiationId: number) => {
    try {
      setActionLoading(negotiationId)
      await apiClient.acceptOffer(negotiationId)
      await fetchDashboardData() // Refresh data
    } catch (err) {
      console.error('Failed to accept offer:', err)
      alert('Failed to accept offer. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCounterOffer = (negotiation: Negotiation) => {
    setSelectedNegotiation(negotiation)
    setCounterAmount(negotiation.current_offer.toString())
    setCounterMessage('')
    setShowCounterModal(true)
  }

  const handleSubmitCounter = async () => {
    if (!selectedNegotiation || !counterAmount) return

    const amount = parseFloat(counterAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid counter offer amount')
      return
    }

    try {
      setActionLoading(selectedNegotiation.id)
      await apiClient.counterOffer(selectedNegotiation.id, amount, counterMessage)
      setShowCounterModal(false)
      setSelectedNegotiation(null)
      setCounterAmount('')
      setCounterMessage('')
      await fetchDashboardData() // Refresh data
    } catch (err) {
      console.error('Failed to submit counter offer:', err)
      alert('Failed to submit counter offer. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleNegotiationExpanded = async (negotiationId: number) => {
    const newExpanded = new Set(expandedNegotiations)
    
    if (expandedNegotiations.has(negotiationId)) {
      newExpanded.delete(negotiationId)
    } else {
      newExpanded.add(negotiationId)
      
      // Fetch offers if we don't have them yet
      if (!negotiationOffers[negotiationId]) {
        try {
          const offers = await apiClient.getNegotiationOffers(negotiationId)
          setNegotiationOffers(prev => ({
            ...prev,
            [negotiationId]: offers || []
          }))
        } catch (err) {
          console.error('Failed to fetch offers:', err)
        }
      }
    }
    
    setExpandedNegotiations(newExpanded)
  }

  // Get negotiations for seller (where user is the seller)
  const sellerNegotiations = negotiations.filter(neg => neg.seller_id === user.id)
  
  // Get active items count
  const activeItems = items.filter(item => item.is_available).length
  const soldItems = items.filter(item => !item.is_available).length
  
  // Get pending offers count
  const pendingOffers = sellerNegotiations.filter(neg => neg.status === 'active').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={onBackToMarketplace}
                className="border-gray-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Marketplace
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
                <p className="text-gray-600 mt-1">Welcome back, {user.username}!</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Listings</p>
                  <p className="text-2xl font-bold text-gray-900">{activeItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Items Sold</p>
                  <p className="text-2xl font-bold text-gray-900">{soldItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Offers</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingOffers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('items')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'items'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                My Listings ({items.length})
              </button>
              <button
                onClick={() => setActiveTab('offers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'offers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Offers ({sellerNegotiations.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'items' && (
              <div>
                {items.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
                    <p className="text-gray-500">Start by creating your first listing!</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {items.map((item) => (
                      <Card key={item.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            {/* Image */}
                            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              {item.image_filename ? (
                                <img 
                                  src={`http://localhost:8000/static/uploads/${item.image_filename}`}
                                  alt={item.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <div className="text-2xl">🪑</div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                                  <div className="flex items-center space-x-4 mt-2">
                                    <span className="text-lg font-bold text-gray-900">${item.starting_price}</span>
                                    <span className={`text-sm font-medium capitalize ${getConditionColor(item.condition)}`}>
                                      {item.condition}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      item.is_available 
                                        ? 'text-green-600 bg-green-100' 
                                        : 'text-gray-600 bg-gray-100'
                                    }`}>
                                      {item.is_available ? 'Available' : 'Sold'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Listed {formatTimeAgo(item.created_at)}
                                  </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onItemClick && onItemClick(item.id)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'offers' && (
              <div>
                {sellerNegotiations.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No offers yet</h3>
                    <p className="text-gray-500">Offers from buyers will appear here.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {sellerNegotiations.map((negotiation) => {
                      const item = items.find(i => i.id === negotiation.item_id)
                      return (
                        <Card key={negotiation.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                    {item?.image_filename ? (
                                      <img 
                                        src={`http://localhost:8000/static/uploads/${item.image_filename}`}
                                        alt={item.name}
                                        className="w-full h-full object-cover rounded-lg"
                                      />
                                    ) : (
                                      <div className="text-xl">🪑</div>
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-gray-900">{item?.name || 'Unknown Item'}</h3>
                                    <p className="text-sm text-gray-600">
                                      Offer: <span className="font-medium">${negotiation.current_offer}</span>
                                    </p>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(negotiation.status)}`}>
                                        {negotiation.status.replace('_', ' ')}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        Round {negotiation.round_number}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {formatTimeAgo(negotiation.updated_at)}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleNegotiationExpanded(negotiation.id)}
                                    className="text-xs"
                                  >
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    Messages
                                    {expandedNegotiations.has(negotiation.id) ? (
                                      <ChevronUp className="h-3 w-3 ml-1" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3 ml-1" />
                                    )}
                                  </Button>
                                  
                                  {negotiation.status === 'active' && (
                                    <>
                                      <Button 
                                        size="sm" 
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => handleAcceptOffer(negotiation.id)}
                                        disabled={actionLoading === negotiation.id}
                                      >
                                        {actionLoading === negotiation.id ? 'Accepting...' : 'Accept'}
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleCounterOffer(negotiation)}
                                        disabled={actionLoading === negotiation.id}
                                      >
                                        Counter
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Message Thread */}
                              {expandedNegotiations.has(negotiation.id) && (
                                <div className="mt-4 border-t pt-4">
                                  <h4 className="text-sm font-medium text-gray-900 mb-3">Message History</h4>
                                  <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {negotiationOffers[negotiation.id]?.map((offer) => (
                                      <div key={offer.id} className={`flex ${offer.offer_type === 'seller' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-xs px-3 py-2 rounded-lg ${
                                          offer.offer_type === 'seller' 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-gray-100 text-gray-900'
                                        }`}>
                                          <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="font-medium">
                                              {offer.offer_type === 'seller' ? 'You' : 'Buyer'}
                                            </span>
                                            <span className="opacity-75">
                                              ${offer.price}
                                            </span>
                                          </div>
                                          {offer.message && (
                                            <p className="text-sm">{offer.message}</p>
                                          )}
                                          <p className={`text-xs mt-1 ${
                                            offer.offer_type === 'seller' ? 'text-blue-100' : 'text-gray-500'
                                          }`}>
                                            {formatTimeAgo(offer.created_at)}
                                          </p>
                                        </div>
                                      </div>
                                    )) || (
                                      <p className="text-sm text-gray-500 text-center py-4">
                                        No messages yet
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Counter Offer Modal */}
      {showCounterModal && selectedNegotiation && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-95 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white">
            <CardContent className="p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Counter Offer</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCounterModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Current Offer</p>
                  <p className="text-lg font-bold text-gray-900">${selectedNegotiation.current_offer}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Counter Offer
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={counterAmount}
                      onChange={(e) => setCounterAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message (optional)
                  </label>
                  <textarea
                    value={counterMessage}
                    onChange={(e) => setCounterMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    placeholder="Add a message to your counter offer..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCounterModal(false)}
                    className="flex-1"
                    disabled={actionLoading === selectedNegotiation.id}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmitCounter}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={actionLoading === selectedNegotiation.id || !counterAmount}
                  >
                    {actionLoading === selectedNegotiation.id ? 'Submitting...' : 'Send Counter Offer'}
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