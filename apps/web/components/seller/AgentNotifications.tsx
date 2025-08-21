'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCircle, X, DollarSign, TrendingUp, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface AgentNotification {
  id: number
  type: string
  title: string
  message: string
  offerPrice: number
  itemName: string
  itemId: number
  buyerName: string
  confidence: number
  reasoning: string
  createdAt: string
  negotiationId: number
  priority: 'high' | 'medium' | 'low'
}

interface AgentNotificationsProps {
  className?: string
}

export function AgentNotifications({ className = '' }: AgentNotificationsProps) {
  const [notifications, setNotifications] = useState<AgentNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    loadNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/agent/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationAction = async (notificationId: number, action: string) => {
    try {
      setActionLoading(notificationId)
      
      const response = await fetch('/api/agent/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          action
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Remove notification from list
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        
        if (result.action === 'offer_accepted') {
          // Show success message or redirect
          window.location.reload() // Simple refresh to update the UI
        }
      } else {
        console.error('Failed to handle notification action')
      }
    } catch (error) {
      console.error('Error handling notification action:', error)
    } finally {
      setActionLoading(null)
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
      <div className={`text-center py-6 ${className}`}>
        <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-gray-600">No agent recommendations</p>
        <p className="text-sm text-gray-500">Your AI agent will notify you when it recommends accepting offers</p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
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
              </div>
              
              <p className="text-sm text-gray-700 mb-3">{notification.message}</p>
              
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Buyer: <strong>{notification.buyerName}</strong></span>
                  <span>Confidence: <strong>{Math.round(notification.confidence * 100)}%</strong></span>
                </div>
                <p className="italic">{notification.reasoning}</p>
              </div>
            </div>
            
            <div className="flex flex-col space-y-2 ml-4">
              <Button
                size="sm"
                onClick={() => handleNotificationAction(notification.id, 'accept_recommendation')}
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
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleNotificationAction(notification.id, 'acknowledge')}
                disabled={actionLoading === notification.id}
                className="text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}