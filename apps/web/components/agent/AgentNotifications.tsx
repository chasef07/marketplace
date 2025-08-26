'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCircle, X, DollarSign, TrendingUp, Clock, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { clientAgentService } from '@/lib/agent/client-service'
import type { AgentNotification } from '@/lib/agent/types'

interface AgentNotificationsProps {
  className?: string
}

export function AgentNotifications({ className = '' }: AgentNotificationsProps) {
  const [notifications, setNotifications] = useState<AgentNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    loadNotifications()
    
    // Set up real-time subscription for immediate updates
    // Poll less frequently as backup (every 2 minutes)
    const interval = setInterval(loadNotifications, 120000)
    
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/agent/notifications')
      if (response.ok) {
        const data = await response.json()
        const notificationList = data.notifications || []
        setNotifications(notificationList)
        
        // Calculate unread count (notifications from last 24 hours are considered new)
        const now = new Date()
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const unread = notificationList.filter((notification: AgentNotification) => 
          new Date(notification.createdAt) > oneDayAgo
        ).length
        setUnreadCount(unread)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const [counterPrice, setCounterPrice] = useState<number | null>(null)
  const [counterMessage, setCounterMessage] = useState('')
  const [showCounterModal, setShowCounterModal] = useState<string | null>(null)

  const handleNotificationAction = async (notificationId: string, action: string, price?: number, message?: string) => {
    try {
      setActionLoading(notificationId)
      
      const response = await fetch('/api/agent/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          action,
          counterPrice: price,
          message: message
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Remove notification from list for most actions
        if (action !== 'counter' || result.success) {
          setNotifications(prev => {
            const filtered = prev.filter(n => n.id !== notificationId)
            // Recalculate unread count
            const now = new Date()
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
            const unread = filtered.filter(notification => 
              new Date(notification.createdAt) > oneDayAgo
            ).length
            setUnreadCount(unread)
            return filtered
          })
        }
        
        if (result.action === 'offer_accepted') {
          // Show success message or redirect
          window.location.reload() // Simple refresh to update the UI
        } else if (result.action === 'counter_offer_created') {
          // Refresh notifications to show updated state
          loadNotifications()
        }
        
        // Close counter modal
        setShowCounterModal(null)
        setCounterPrice(null)
        setCounterMessage('')
      } else {
        console.error('Failed to handle notification action')
      }
    } catch (error) {
      console.error('Error handling notification action:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const openCounterModal = (notificationId: string, currentPrice: number) => {
    setShowCounterModal(notificationId)
    setCounterPrice(currentPrice * 0.9) // Start with 10% lower as suggestion
    setCounterMessage('')
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-orange-200 bg-orange-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <TrendingUp className="w-4 h-4 text-red-600" />
      case 'medium': return <DollarSign className="w-4 h-4 text-orange-600" />
      default: return <Bell className="w-4 h-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Agent Recommendations
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </h3>
        </div>
        <div className="text-center py-6">
          <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">No agent recommendations</p>
          <p className="text-sm text-gray-500">Your AI agent will notify you when it recommends accepting offers</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Agent Recommendations
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </h3>
      </div>
      <div className="space-y-3">
      {notifications.map((notification) => (
        <Card key={notification.id} className={`p-4 ${getPriorityColor(notification.priority)}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                {getPriorityIcon(notification.priority)}
                <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                <span className="text-xs text-gray-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTimeAgo(notification.createdAt)}
                </span>
                <button
                  onClick={() => window.open(`/item/${notification.itemId}`, '_blank')}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                  title="View listing"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              
              <p className="text-sm text-gray-700 mb-3">{notification.message}</p>
              
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex items-center justify-between">
                  {notification.buyerName && (
                    <span>Buyer: <strong>{notification.buyerName}</strong></span>
                  )}
                  {notification.sellerName && (
                    <span>Seller: <strong>{notification.sellerName}</strong></span>
                  )}
                  {notification.confidence && (
                    <span>Confidence: <strong>{Math.round(notification.confidence * 100)}%</strong></span>
                  )}
                </div>
                {notification.reasoning && (
                  <p className="italic">{notification.reasoning}</p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col space-y-2 ml-4">
              {notification.actions.includes('accept') && (
                <Button
                  size="sm"
                  onClick={() => handleNotificationAction(notification.id, 'accept')}
                  disabled={actionLoading === notification.id}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {actionLoading === notification.id ? (
                    'Accepting...'
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Accept {formatCurrency(notification.offerPrice)}
                    </>
                  )}
                </Button>
              )}
              
              {notification.actions.includes('counter') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openCounterModal(notification.id, notification.offerPrice)}
                  disabled={actionLoading === notification.id}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                >
                  <DollarSign className="w-3 h-3 mr-1" />
                  Counter
                </Button>
              )}
              
              {notification.actions.includes('decline') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleNotificationAction(notification.id, 'decline')}
                  disabled={actionLoading === notification.id}
                  className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                >
                  <X className="w-3 h-3 mr-1" />
                  Decline
                </Button>
              )}
              
              {notification.actions.includes('dismiss') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleNotificationAction(notification.id, 'dismiss')}
                  disabled={actionLoading === notification.id}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Dismiss
                </Button>
              )}
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
                  Counter Price
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
                  placeholder="Add a note for the buyer..."
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
                onClick={() => handleNotificationAction(showCounterModal, 'counter', counterPrice || 0, counterMessage)}
                disabled={!counterPrice || counterPrice <= 0 || actionLoading === showCounterModal}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {actionLoading === showCounterModal ? 'Sending...' : 'Send Counter Offer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}