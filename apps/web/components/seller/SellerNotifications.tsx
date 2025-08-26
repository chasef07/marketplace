'use client'

import { useState, useEffect, useMemo } from 'react'
import { CheckCircle, Clock, DollarSign, Package, User, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase'
import { apiClient } from '@/lib/api-client-new'

interface PendingConfirmation {
  id: number
  final_price: number
  created_at: string
  buyer_username: string
  item: {
    id: number
    name: string
    images?: Array<{ filename: string; order: number; is_primary: boolean }>
  }
}

interface SellerNotificationsProps {
  userId: string
  className?: string
}

export function SellerNotifications({ userId, className = '' }: SellerNotificationsProps) {
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (userId) {
      loadPendingConfirmations()
      setupRealTimeSubscriptions()
    }
  }, [userId])

  const loadPendingConfirmations = async () => {
    try {
      // Get negotiations in buyer_accepted status (need seller confirmation)
      const { data: negotiations, error } = await supabase
        .from('negotiations')
        .select(`
          id,
          final_price,
          created_at,
          buyer_id,
          profiles!negotiations_buyer_id_fkey(username),
          items!inner(
            id,
            name,
            images
          )
        `)
        .eq('seller_id', userId)
        .eq('status', 'buyer_accepted')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading pending confirmations:', error)
        return
      }

      const processedConfirmations: PendingConfirmation[] = negotiations?.map((negotiation: any) => ({
        id: negotiation.id,
        final_price: negotiation.final_price,
        created_at: negotiation.created_at,
        buyer_username: negotiation.profiles?.username || 'Unknown Buyer',
        item: {
          id: negotiation.items.id,
          name: negotiation.items.name,
          images: negotiation.items.images
        }
      })) || []

      setPendingConfirmations(processedConfirmations)
    } catch (error) {
      console.error('Error processing pending confirmations:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealTimeSubscriptions = () => {
    // Subscribe to new buyer_accepted negotiations
    const subscription = supabase
      .channel(`seller_confirmations_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'negotiations',
          filter: `seller_id=eq.${userId}`
        },
        (payload) => {
          if (payload.new.status === 'buyer_accepted') {
            console.log('🛎️ New buyer acceptance awaiting confirmation:', payload.new)
            setTimeout(() => loadPendingConfirmations(), 1000)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const confirmDeal = async (negotiationId: number) => {
    setActionLoading(negotiationId)
    try {
      const headers = await apiClient.getAuthHeaders(true)
      const response = await fetch(`/api/negotiations/${negotiationId}/seller-confirm`, {
        method: 'POST',
        headers,
      })

      if (response.ok) {
        // Remove from pending confirmations
        setPendingConfirmations(prev => prev.filter(p => p.id !== negotiationId))
        console.log('Deal confirmed successfully')
      } else {
        const error = await response.json()
        alert(`Failed to confirm deal: ${error.error}`)
      }
    } catch (error) {
      console.error('Confirm deal error:', error)
      alert('An error occurred while confirming the deal')
    } finally {
      setActionLoading(null)
    }
  }

  const getItemImageUrl = (item: PendingConfirmation['item']) => {
    let filename = null
    
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      const primaryImage = item.images.find((img: any) => img.is_primary) || item.images[0]
      filename = primaryImage?.filename
    }
    
    if (!filename) return null
    const { data } = supabase.storage.from('furniture-images').getPublicUrl(filename)
    return data.publicUrl
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
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg mb-3"></div>
          ))}
        </div>
      </div>
    )
  }

  if (pendingConfirmations.length === 0) {
    return null // Don't show anything if no pending confirmations
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
          Action Required
          <Badge variant="destructive" className="ml-2">
            {pendingConfirmations.length}
          </Badge>
        </h3>
      </div>

      <div className="space-y-3">
        {pendingConfirmations.map((confirmation) => (
          <Card 
            key={confirmation.id} 
            className="p-4 border-orange-200 bg-orange-50 ring-1 ring-orange-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {/* Item Image */}
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {getItemImageUrl(confirmation.item) ? (
                    <img
                      src={getItemImageUrl(confirmation.item)!}
                      alt={confirmation.item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Sale Confirmation Required
                  </h4>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">{confirmation.buyer_username}</span> accepted your offer for{' '}
                    <span className="font-bold">{confirmation.item.name}</span>
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-600">
                    <span className="flex items-center">
                      <DollarSign className="w-3 h-3 mr-1 text-green-600" />
                      <span className="font-bold text-green-600">
                        {formatCurrency(confirmation.final_price)}
                      </span>
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimeAgo(confirmation.created_at)}
                    </span>
                    <span className="flex items-center">
                      <User className="w-3 h-3 mr-1" />
                      @{confirmation.buyer_username}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex flex-col space-y-2 ml-4">
                <Button
                  size="sm"
                  onClick={() => confirmDeal(confirmation.id)}
                  disabled={actionLoading === confirmation.id}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {actionLoading === confirmation.id ? 'Confirming...' : (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Confirm Sale
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-gray-600 text-center">
                  Confirm to proceed
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Next steps:</strong> Once confirmed, coordinate pickup/payment details with the buyer to complete the transaction.
        </p>
      </div>
    </div>
  )
}