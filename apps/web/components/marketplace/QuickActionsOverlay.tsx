'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Clock,
  User,
  Package,
  TrendingUp,
  Sparkles
} from 'lucide-react'
import { apiClient } from '@/lib/api-client-new'

interface Negotiation {
  id: number
  current_offer: number
  status: string
  created_at: string
  recent_message?: string
  recent_offer_time?: string
  hours_since_offer?: number
  is_recent: boolean
  buyer_offer_type?: string
  items: Array<{
    id: number
    name: string
    starting_price: number
  }>
  profiles: Array<{
    username: string
    email: string
  }>
}

interface QuickActionsOverlayProps {
  trigger?: React.ReactNode
}

export function QuickActionsOverlay({ trigger }: QuickActionsOverlayProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [negotiations, setNegotiations] = useState<Negotiation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedNegotiation, setSelectedNegotiation] = useState<Negotiation | null>(null)
  const [actionType, setActionType] = useState<'accept' | 'decline' | 'counter' | null>(null)
  const [counterPrice, setCounterPrice] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [dashboardStats, setDashboardStats] = useState({ totalItems: 0, totalViews: 0 })
  const [bulkActionType, setBulkActionType] = useState<'accept-highest' | 'decline-lowballs' | 'counter-all' | null>(null)
  const [bulkCounterPrice, setBulkCounterPrice] = useState('')

  // Load negotiations when overlay opens
  useEffect(() => {
    if (isOpen) {
      loadNegotiations()
    }
  }, [isOpen])

  const loadNegotiations = async () => {
    setIsLoading(true)
    try {
      const headers = await apiClient.getAuthHeaders()
      const [negotiationsResponse, itemsResponse] = await Promise.all([
        fetch('/api/marketplace/quick-actions', { headers }),
        fetch('/api/items/my-items', { headers }).catch(() => null)
      ])
      
      if (!negotiationsResponse.ok) {
        throw new Error('Failed to load negotiations')
      }
      
      const negotiationsData = await negotiationsResponse.json()
      setNegotiations(negotiationsData.negotiations || [])

      // Load basic stats if available
      if (itemsResponse?.ok) {
        const itemsData = await itemsResponse.json()
        const totalViews = itemsData.reduce((sum: number, item: {views_count?: number}) => sum + (item.views_count || 0), 0)
        setDashboardStats({
          totalItems: itemsData.length || 0,
          totalViews: totalViews || 0
        })
      }
    } catch (error) {
      console.error('Failed to load negotiations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedNegotiation || !actionType || isProcessing) return
    
    setIsProcessing(true)
    try {
      const headers = await apiClient.getAuthHeaders(true)
      
      const body: Record<string, unknown> = {
        action: actionType,
        negotiation_id: selectedNegotiation.id
      }

      if (actionType === 'counter') {
        const price = parseFloat(counterPrice)
        if (isNaN(price) || price <= 0) {
          throw new Error('Please enter a valid price')
        }
        body.price = price
        body.message = 'Counter offer'
      } else if (actionType === 'decline') {
        body.reason = declineReason || 'Offer declined'
      }

      const response = await fetch('/api/marketplace/quick-actions', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Action failed')
      }
      
      // If offer was accepted, trigger chat mode switch
      if (actionType === 'accept') {
        const buyerName = selectedNegotiation.profiles[0]?.username || 'Unknown'
        // Dispatch custom event for chat handoff
        window.dispatchEvent(new CustomEvent('offerAccepted', {
          detail: { 
            buyerName: buyerName,
            negotiationId: selectedNegotiation.id 
          }
        }))
      }
      
      // Refresh negotiations and reset state
      await loadNegotiations()
      setSelectedNegotiation(null)
      setActionType(null)
      setCounterPrice('')
      setDeclineReason('')
    } catch (error) {
      console.error('Action failed:', error)
      alert((error as Error).message || 'Action failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkAction = async () => {
    if (!bulkActionType || isProcessing || negotiations.length === 0) return

    setIsProcessing(true)
    try {
      const headers = await apiClient.getAuthHeaders(true)
      
      if (bulkActionType === 'accept-highest') {
        // Find the highest offer and accept it
        const highest = negotiations.reduce((max, neg) => 
          parseFloat(neg.current_offer.toString()) > parseFloat(max.current_offer.toString()) ? neg : max
        )
        
        const response = await fetch('/api/marketplace/quick-actions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'accept',
            negotiation_id: highest.id
          })
        })
        
        if (!response.ok) throw new Error('Failed to accept highest offer')
        
        // Trigger chat mode switch for highest offer acceptance
        const buyerName = highest.profiles[0]?.username || 'Unknown'
        window.dispatchEvent(new CustomEvent('offerAccepted', {
          detail: { 
            buyerName: buyerName,
            negotiationId: highest.id 
          }
        }))
        
      } else if (bulkActionType === 'decline-lowballs') {
        // Decline offers below 70% of starting price
        const lowballs = negotiations.filter(neg => {
          const startingPrice = parseFloat(neg.items[0]?.starting_price.toString() || '0')
          const offerPrice = parseFloat(neg.current_offer.toString())
          return startingPrice > 0 && (offerPrice / startingPrice) < 0.7
        })
        
        for (const neg of lowballs) {
          await fetch('/api/marketplace/quick-actions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              action: 'decline',
              negotiation_id: neg.id,
              reason: 'Offer too low'
            })
          })
        }
        
      } else if (bulkActionType === 'counter-all') {
        const price = parseFloat(bulkCounterPrice)
        if (isNaN(price) || price <= 0) {
          throw new Error('Please enter a valid counter price')
        }
        
        // Counter all negotiations with the same price
        for (const neg of negotiations) {
          await fetch('/api/marketplace/quick-actions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              action: 'counter',
              negotiation_id: neg.id,
              price: price,
              message: 'Counter offer to all buyers'
            })
          })
        }
      }
      
      // Refresh negotiations and reset state
      await loadNegotiations()
      setBulkActionType(null)
      setBulkCounterPrice('')
    } catch (error) {
      console.error('Bulk action failed:', error)
      alert((error as Error).message || 'Bulk action failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetToMain = () => {
    setSelectedNegotiation(null)
    setActionType(null)
    setCounterPrice('')
    setDeclineReason('')
    setBulkActionType(null)
    setBulkCounterPrice('')
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            size="sm" 
            className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-xl backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300"
          >
            <Sparkles className="w-6 h-6 text-white" />
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-md p-0 border-0 bg-transparent shadow-none">
        <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-gray-800 text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Quick Actions
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white/10 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : bulkActionType ? (
              // Bulk action confirmation view
              <div className="space-y-4">
                <Button
                  onClick={resetToMain}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 p-0 h-auto"
                >
                  ← Back to offers
                </Button>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-800 font-medium">
                      {bulkActionType === 'accept-highest' ? 'Accept Highest Offer' :
                       bulkActionType === 'decline-lowballs' ? 'Decline Lowballs (<70% of asking)' :
                       'Counter All Offers'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {bulkActionType === 'accept-highest' ? `Accept the highest offer: ${formatPrice(Math.max(...negotiations.map(n => parseFloat(n.current_offer.toString()))))}` :
                     bulkActionType === 'decline-lowballs' ? `Decline ${negotiations.filter(n => {
                       const sp = parseFloat(n.items[0]?.starting_price.toString() || '0')
                       const op = parseFloat(n.current_offer.toString())
                       return sp > 0 && (op / sp) < 0.7
                     }).length} offers below 70% of asking price` :
                     `Send counter offer to all ${negotiations.length} buyers`}
                  </p>
                </div>

                {bulkActionType === 'counter-all' && (
                  <div className="space-y-2">
                    <label className="text-gray-700 text-sm">Counter offer amount:</label>
                    <Input
                      type="number"
                      placeholder="Enter price..."
                      value={bulkCounterPrice}
                      onChange={(e) => setBulkCounterPrice(e.target.value)}
                      className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleBulkAction}
                    disabled={isProcessing || (bulkActionType === 'counter-all' && !bulkCounterPrice)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isProcessing ? 'Processing...' : 'Confirm'}
                  </Button>
                  <Button
                    onClick={resetToMain}
                    variant="ghost"
                    className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : selectedNegotiation && actionType ? (
              // Action confirmation view
              <div className="space-y-4">
                <Button
                  onClick={resetToMain}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 p-0 h-auto"
                >
                  ← Back to offers
                </Button>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-800 font-medium">
                      {selectedNegotiation.items[0]?.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Current offer:</span>
                    <span className="text-gray-800 font-semibold">
                      {formatPrice(selectedNegotiation.current_offer)}
                    </span>
                  </div>
                </div>

                {actionType === 'counter' && (
                  <div className="space-y-2">
                    <label className="text-gray-700 text-sm">Counter offer amount:</label>
                    <Input
                      type="number"
                      placeholder="Enter price..."
                      value={counterPrice}
                      onChange={(e) => setCounterPrice(e.target.value)}
                      className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {actionType === 'decline' && (
                  <div className="space-y-2">
                    <label className="text-gray-700 text-sm">Reason (optional):</label>
                    <Input
                      placeholder="Too low, not interested, etc..."
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleAction}
                    disabled={isProcessing || (actionType === 'counter' && !counterPrice)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isProcessing ? 'Processing...' : `Confirm ${actionType}`}
                  </Button>
                  <Button
                    onClick={resetToMain}
                    variant="ghost"
                    className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              // Main negotiations view
              <div className="space-y-4">
                {negotiations.length === 0 ? (
                  <div className="space-y-4">
                    <div className="text-center py-4 text-gray-600">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="font-medium text-gray-800">No active offers yet</p>
                      <p className="text-sm mt-1">Here&apos;s what you can do:</p>
                    </div>

                    <div className="space-y-3">
                      <Button
                        onClick={() => {
                          // Trigger create listing action
                          window.dispatchEvent(new CustomEvent('navigate-to-create-listing'))
                          setIsOpen(false)
                        }}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 justify-start"
                      >
                        <Package className="w-4 h-4 mr-3 text-blue-600" />
                        <div className="text-left">
                          <div className="font-medium">Create New Listing</div>
                          <div className="text-xs text-blue-600">Upload photos and let AI analyze your furniture</div>
                        </div>
                      </Button>

                      <Button
                        onClick={() => {
                          // Show marketplace (where users can see their items)
                          window.dispatchEvent(new CustomEvent('navigate-to-marketplace'))
                          setIsOpen(false)
                        }}
                        className="w-full bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 justify-start"
                      >
                        <TrendingUp className="w-4 h-4 mr-3 text-green-600" />
                        <div className="text-left">
                          <div className="font-medium">View My Items</div>
                          <div className="text-xs text-green-600">Manage your existing listings</div>
                        </div>
                      </Button>

                      <Button
                        onClick={() => {
                          // Browse marketplace
                          window.dispatchEvent(new CustomEvent('navigate-to-marketplace'))
                          setIsOpen(false)
                        }}
                        className="w-full bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 justify-start"
                      >
                        <MessageCircle className="w-4 h-4 mr-3 text-purple-600" />
                        <div className="text-left">
                          <div className="font-medium">Browse Marketplace</div>
                          <div className="text-xs text-purple-600">Find furniture to buy</div>
                        </div>
                      </Button>

                      {dashboardStats.totalItems > 0 && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-gray-800 font-medium text-sm">Your Stats</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="text-xl font-bold text-gray-800">{dashboardStats.totalItems}</div>
                              <div className="text-xs text-gray-600">Active Items</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-bold text-gray-800">{dashboardStats.totalViews}</div>
                              <div className="text-xs text-gray-600">Total Views</div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-yellow-600" />
                          <span className="text-gray-800 font-medium text-sm">
                            {dashboardStats.totalItems === 0 ? 'Getting Started' : 'Pro Tip'}
                          </span>
                        </div>
                        <p className="text-gray-700 text-xs">
                          {dashboardStats.totalItems === 0 
                            ? 'Create your first listing to start selling! Our AI will analyze your furniture photos and suggest optimal pricing.'
                            : dashboardStats.totalViews === 0
                            ? 'Your items need more visibility! Try updating photos or adjusting prices to attract more buyers.'
                            : 'Upload quality photos and let our AI analyze your furniture for better pricing suggestions and faster sales!'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-600 text-sm">
                        {negotiations.length} active offer{negotiations.length !== 1 ? 's' : ''}
                      </span>
                      <Button
                        onClick={loadNegotiations}
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 h-auto p-1"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Smart Bulk Action Buttons */}
                    {negotiations.length > 1 && (
                      <div className="mb-4 space-y-2">
                        <div className="text-xs text-gray-500 mb-2">Quick Actions:</div>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            onClick={() => setBulkActionType('accept-highest')}
                            size="sm"
                            className="text-xs bg-green-50 hover:bg-green-100 text-green-800 border border-green-200"
                          >
                            Accept Highest
                          </Button>
                          <Button
                            onClick={() => setBulkActionType('counter-all')}
                            size="sm"
                            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200"
                          >
                            Counter All
                          </Button>
                          <Button
                            onClick={() => setBulkActionType('decline-lowballs')}
                            size="sm"
                            className="text-xs bg-red-50 hover:bg-red-100 text-red-800 border border-red-200"
                          >
                            Decline Lowballs
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {negotiations.map((negotiation) => (
                        <div
                          key={negotiation.id}
                          className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Package className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                <span className="text-gray-800 font-medium truncate">
                                  {negotiation.items[0]?.name || 'Unknown Item'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                <User className="w-3 h-3" />
                                <span>{negotiation.profiles[0]?.username || 'Unknown'}</span>
                                {negotiation.profiles[0]?.username === 'Unknown' && (
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">New</Badge>
                                )}
                                <Clock className="w-3 h-3 ml-2" />
                                <span>{formatTimeAgo(negotiation.created_at)}</span>
                                {negotiation.is_recent && (
                                  <Badge className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800">Recent</Badge>
                                )}
                              </div>
                              {negotiation.recent_message && (
                                <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-100 rounded-lg px-3 py-2 mt-2">
                                  <MessageCircle className="w-3 h-3 text-gray-500 flex-shrink-0" />
                                  <span className="italic">&quot;{negotiation.recent_message}&quot;</span>
                                </div>
                              )}
                            </div>
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              {formatPrice(negotiation.current_offer)}
                            </Badge>
                          </div>

                          <div className="border-t border-gray-200 my-3" />

                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                setSelectedNegotiation(negotiation)
                                setActionType('accept')
                              }}
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedNegotiation(negotiation)
                                setActionType('counter')
                              }}
                              size="sm"
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Counter
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedNegotiation(negotiation)
                                setActionType('decline')
                              }}
                              size="sm"
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}