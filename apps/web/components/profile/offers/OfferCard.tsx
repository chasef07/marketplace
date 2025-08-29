'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ShoppingBag, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  Bot,
  TrendingUp,
  Clock
} from 'lucide-react'
import { BLUR_PLACEHOLDERS } from '@/lib/blur-data'
import { formatPrice, formatTimeAgo, getItemImageUrl } from '@/lib/utils/profile'
import { BuyerOffer } from './types'

interface OfferCardProps {
  offer: BuyerOffer
  onBuyerAccept: (negotiationId: number) => Promise<void>
  onSubmitCounterOffer: (itemId: number, price: string, message: string) => Promise<void>
  submitting: boolean
}

export default function OfferCard({ offer, onBuyerAccept, onSubmitCounterOffer, submitting }: OfferCardProps) {
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [offerPrice, setOfferPrice] = useState('')
  const [offerMessage, setOfferMessage] = useState('')

  const getStatusBadge = (offer: BuyerOffer) => {
    if (offer.status === 'accepted') {
      if (offer.negotiation_status === 'buyer_accepted') {
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle className="h-3 w-3 mr-1" />Pending Confirmation</Badge>
      } else if (offer.negotiation_status === 'deal_pending') {
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><Clock className="h-3 w-3 mr-1" />Confirmed Sale</Badge>
      } else if (offer.negotiation_status === 'completed') {
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
      }
    }
    
    switch (offer.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>
      case 'declined':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>
      case 'superseded':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><TrendingUp className="h-3 w-3 mr-1" />Counter Received</Badge>
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Unknown</Badge>
    }
  }

  const handleSubmitOffer = async () => {
    if (!offerPrice || submitting) return
    
    await onSubmitCounterOffer(offer.item.id, offerPrice, offerMessage)
    setOfferPrice('')
    setOfferMessage('')
    setShowOfferForm(false)
  }

  const imageUrl = getItemImageUrl(offer.item)

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-all duration-200">
      <div className="flex flex-col md:flex-row gap-4">
        <Link href={`/marketplace/${offer.item.id}`} className="flex-shrink-0 group">
          <div className="w-16 h-16 relative bg-white rounded-lg overflow-hidden group-hover:ring-2 group-hover:ring-blue-500 transition-all duration-200">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={offer.item.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                placeholder="blur"
                blurDataURL={BLUR_PLACEHOLDERS.furniture}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-slate-400" />
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <Link href={`/marketplace/${offer.item.id}`} className="group">
                <h3 className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors text-sm">
                  {offer.item.name}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <Link href={`/profile/${offer.seller.username}`} className="text-xs text-slate-600 hover:text-blue-600 transition-colors">
                  @{offer.seller.username}
                </Link>
                {offer.item.agent_enabled && (
                  <span className="inline-flex items-center bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full text-xs font-medium">
                    <Bot className="h-2.5 w-2.5 mr-1" />
                    AI
                  </span>
                )}
              </div>
            </div>
            {getStatusBadge(offer)}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-slate-500">Listed</p>
              <p className="font-medium text-slate-900">{formatPrice(offer.item.starting_price)}</p>
            </div>
            <div>
              <p className="text-slate-500">Your Offer</p>
              <p className="font-medium text-blue-600">{formatPrice(offer.price)}</p>
            </div>
            {offer.latest_seller_offer && (
              <div>
                <p className="text-slate-500">Counter</p>
                <p className="font-medium text-orange-600">{formatPrice(offer.latest_seller_offer.price)}</p>
              </div>
            )}
            <div>
              <p className="text-slate-500">Submitted</p>
              <p className="font-medium text-slate-900">{formatTimeAgo(offer.created_at)}</p>
            </div>
          </div>

          {offer.status === 'superseded' && offer.latest_seller_offer && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => onBuyerAccept(offer.negotiation_id)}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-xs h-8"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Accept {formatPrice(offer.latest_seller_offer.price)}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowOfferForm(true)}
                disabled={submitting}
                className="text-xs h-8"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Counter
              </Button>
            </div>
          )}

          {offer.status === 'pending' && (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <Clock className="h-3 w-3" />
              Waiting for seller response...
            </div>
          )}
        </div>
      </div>

      {showOfferForm && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <h4 className="font-medium mb-3 text-sm">Make a Counter Offer</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Price</Label>
              <Input
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder="Enter amount"
                className="h-8 text-sm"
                min="0"
                step="0.01"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Message (Optional)</Label>
              <Input
                type="text"
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                placeholder="Add a message..."
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleSubmitOffer}
              disabled={!offerPrice || submitting}
              className="text-xs h-8"
            >
              {submitting ? 'Submitting...' : 'Submit Counter'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowOfferForm(false)}
              disabled={submitting}
              className="text-xs h-8"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}