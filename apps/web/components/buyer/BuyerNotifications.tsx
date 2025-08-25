'use client'

import { useState, useEffect } from 'react'
import { Bell, Bot, Clock, DollarSign, TrendingUp, X, Eye, MessageSquare, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/src/lib/supabase'

interface BuyerNotification {
  id: string
  type: 'agent_counter_offer' | 'offer_accepted' | 'offer_declined'
  title: string
  message: string
  negotiation_id: number
  item_id: number
  item_name: string
  seller_name: string
  offer_price: number
  agent_generated: boolean
  confidence_score?: number
  reasoning?: string
  created_at: string
  needs_attention: boolean
  read: boolean
}

interface BuyerNotificationsProps {
  userId: string
  className?: string
}

export function BuyerNotifications({ userId, className = '' }: BuyerNotificationsProps) {
  const [notifications, setNotifications] = useState<BuyerNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showCounterModal, setShowCounterModal] = useState<string | null>(null)
  const [counterPrice, setCounterPrice] = useState<number | null>(null)
  const [counterMessage, setCounterMessage] = useState('')

  const supabase = createClient()

  useEffect(() => {
    if (userId) {
      loadNotifications()
      setupRealTimeSubscriptions()
    }
  }, [userId])

  const loadNotifications = async () => {
    try {
      // Get buyer's negotiations with latest offers that need attention
      const { data: negotiations, error } = await supabase
        .from('negotiations')
        .select(`
          id,
          item_id,
          seller_id,
          status,
          created_at,
          items!inner(
            id,
            name,
            starting_price
          ),
          profiles!negotiations_seller_id_fkey(
            username
          ),
          offers!inner(
            id,
            price,
            offer_type,
            is_counter_offer,
            agent_generated,
            agent_decision_id,
            created_at,
            agent_decisions(
              confidence_score,
              reasoning
            )
          )
        `)
        .eq('buyer_id', userId)
        .eq('status', 'active')
        .order('created_at', { foreignTable: 'offers', ascending: false })

      if (error) {
        console.error('Error loading buyer notifications:', error)
        return
      }

      // Process notifications from negotiations
      const processedNotifications: BuyerNotification[] = []

      negotiations?.forEach((negotiation) => {
        const latestOffer = negotiation.offers?.[0]
        
        if (latestOffer && 
            latestOffer.offer_type === 'seller' && 
            latestOffer.is_counter_offer) {
          
          const notificationId = `seller_offer_${latestOffer.id}`
          const agentDecision = latestOffer.agent_decisions?.[0]
          
          const notification: BuyerNotification = {
            id: notificationId,
            type: 'agent_counter_offer',
            title: latestOffer.agent_generated ? 'AI Agent Counter Offer' : 'Counter Offer Received',
            message: `${latestOffer.agent_generated ? 'AI Agent' : negotiation.profiles?.username} countered your offer with $${latestOffer.price}`,
            negotiation_id: negotiation.id,
            item_id: negotiation.item_id,
            item_name: negotiation.items?.name || 'Unknown Item',
            seller_name: negotiation.profiles?.username || 'Unknown Seller',
            offer_price: latestOffer.price,
            agent_generated: latestOffer.agent_generated,
            confidence_score: agentDecision?.confidence_score,
            reasoning: agentDecision?.reasoning,
            created_at: latestOffer.created_at,
            needs_attention: true,
            read: false // In a real app, you'd track this in the database
          }
          
          processedNotifications.push(notification)
        }
      })

      // Sort by newest first
      processedNotifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setNotifications(processedNotifications)
      setUnreadCount(processedNotifications.filter(n => !n.read && n.needs_attention).length)
    } catch (error) {
      console.error('Error processing buyer notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealTimeSubscriptions = () => {
    // Subscribe to new offers for buyer's negotiations
    const offersSubscription = supabase
      .channel(`buyer_offers_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offers',
          filter: `offer_type=eq.seller`
        },
        async (payload) => {
          // Check if this offer is for one of the buyer's negotiations
          const { data: negotiation } = await supabase
            .from('negotiations')
            .select('buyer_id')
            .eq('id', payload.new.negotiation_id)
            .single()

          if (negotiation?.buyer_id === userId) {
            console.log('🛎️ New seller offer received for buyer:', payload.new)
            // Refresh notifications
            setTimeout(() => loadNotifications(), 1000)
          }
        }
      )
      .subscribe()

    return () => {
      offersSubscription.unsubscribe()
    }
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId 
          ? { ...n, read: true, needs_attention: false }
          : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    const notification = notifications.find(n => n.id === notificationId)
    if (notification && !notification.read && notification.needs_attention) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const acceptOffer = async (notification: BuyerNotification) => {
    if (!notification.id.startsWith('seller_offer_')) return

    setActionLoading(notification.id)
    try {
      const offerId = notification.id.replace('seller_offer_', '')
      const response = await fetch(`/api/buyer/offers/${offerId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Offer accepted:', result)
        
        // Remove notification and reload
        setNotifications(prev => prev.filter(n => n.id !== notification.id))
        setUnreadCount(prev => Math.max(0, prev - 1))
        
        // You might want to show a success message here
        alert(`Successfully purchased ${notification.item_name} for ${formatCurrency(notification.offer_price)}!`)
      } else {
        const error = await response.json()
        alert(`Failed to accept offer: ${error.error}`)
      }
    } catch (error) {
      console.error('Accept offer error:', error)
      alert('An error occurred while accepting the offer')
    } finally {
      setActionLoading(null)
    }
  }

  const openCounterModal = (notification: BuyerNotification) => {
    setShowCounterModal(notification.id)
    setCounterPrice(Math.max(notification.offer_price * 0.95, 1)) // Start 5% below their offer
    setCounterMessage('')
  }

  const submitCounterOffer = async () => {
    if (!showCounterModal || !counterPrice) return

    const notification = notifications.find(n => n.id === showCounterModal)
    if (!notification) return

    setActionLoading(showCounterModal)
    try {
      const response = await fetch(`/api/negotiations/items/${notification.item_id}/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price: counterPrice,
          message: counterMessage,
        }),
      })

      if (response.ok) {
        // Close modal and remove notification
        setShowCounterModal(null)
        setCounterPrice(null)
        setCounterMessage('')
        setNotifications(prev => prev.filter(n => n.id !== showCounterModal))
        setUnreadCount(prev => Math.max(0, prev - 1))
        
        alert('Counter offer submitted successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to submit counter offer: ${error.error}`)
      }
    } catch (error) {
      console.error('Counter offer error:', error)
      alert('An error occurred while submitting counter offer')
    } finally {
      setActionLoading(null)
    }
  }

  const navigateToNegotiation = (negotiationId: number, itemId: number) => {
    // In a real app, this would navigate to the item detail with the negotiation
    console.log(`Navigate to item ${itemId} negotiation ${negotiationId}`)
    // For now, just mark as read
    const notificationId = notifications.find(n => n.negotiation_id === negotiationId)?.id
    if (notificationId) {
      markAsRead(notificationId)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const created = new Date(timestamp)
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg mb-3"></div>
          ))}
        </div>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-gray-600">No new notifications</p>
        <p className="text-sm text-gray-500">You'll be notified when sellers respond to your offers</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Notifications
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </h3>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {notifications.map((notification) => (
          <Card 
            key={notification.id} 
            className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
              notification.needs_attention && !notification.read
                ? 'border-blue-200 bg-blue-50 ring-1 ring-blue-200'
                : 'border-gray-200'
            }`}
            onClick={() => navigateToNegotiation(notification.negotiation_id, notification.item_id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {notification.agent_generated ? (
                    <Bot className="w-4 h-4 text-blue-600" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-gray-600" />
                  )}
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {notification.title}
                  </h4>
                  {notification.needs_attention && !notification.read && (
                    <Badge variant="destructive" className="text-xs">New</Badge>
                  )}
                  <span className="text-xs text-gray-500 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTimeAgo(notification.created_at)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Item: <strong>{notification.item_name}</strong></span>
                    <span className="flex items-center text-green-600 font-medium">
                      <DollarSign className="w-3 h-3 mr-1" />
                      {formatCurrency(notification.offer_price)}
                    </span>
                  </div>
                  
                  {notification.agent_generated && notification.confidence_score && (
                    <div className="bg-blue-100 p-2 rounded text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">AI Confidence:</span>
                        <span className="font-bold text-blue-700">
                          {Math.round(notification.confidence_score * 100)}%
                        </span>
                      </div>
                      {notification.reasoning && (
                        <p className="italic text-blue-700">{notification.reasoning.substring(0, 100)}...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col space-y-1 ml-4">
                {notification.type === 'agent_counter_offer' && (
                  <>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        acceptOffer(notification)
                      }}
                      disabled={actionLoading === notification.id}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                      {actionLoading === notification.id ? 'Accepting...' : (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Accept {formatCurrency(notification.offer_price)}
                        </>
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        openCounterModal(notification)
                      }}
                      disabled={actionLoading === notification.id}
                      className="text-xs"
                    >
                      <DollarSign className="w-3 h-3 mr-1" />
                      Counter
                    </Button>
                  </>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigateToNegotiation(notification.negotiation_id, notification.item_id)
                  }}
                  className="text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    dismissNotification(notification.id)
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Counter Offer Modal */}
      {showCounterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Make Counter Offer</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Counter Offer
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={counterPrice || ''}
                    onChange={(e) => setCounterPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    min="0"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add a note for the seller..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCounterModal(null)
                  setCounterPrice(null)
                  setCounterMessage('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={submitCounterOffer}
                disabled={!counterPrice || counterPrice <= 0 || actionLoading === showCounterModal}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {actionLoading === showCounterModal ? 'Submitting...' : 'Send Counter Offer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}