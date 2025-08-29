'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, CheckCircle, XCircle } from 'lucide-react'
import { BuyerOffer } from './types'
import OfferCard from './OfferCard'

interface OfferTabsProps {
  offers: BuyerOffer[]
  onBuyerAccept: (negotiationId: number) => Promise<void>
  onSubmitCounterOffer: (itemId: number, price: string, message: string) => Promise<void>
  submitting: boolean
}

export default function OfferTabs({ offers, onBuyerAccept, onSubmitCounterOffer, submitting }: OfferTabsProps) {
  // Organize offers by status
  const activeOffers = offers.filter(offer => offer.status === 'pending' || offer.status === 'superseded')
  const acceptedOffers = offers.filter(offer => offer.status === 'accepted')
  const otherOffers = offers.filter(offer => !['pending', 'superseded', 'accepted'].includes(offer.status))

  const renderEmptyState = (icon: React.ReactNode, message: string) => (
    <div className="text-center py-8">
      <div className="mx-auto h-8 w-8 text-slate-400 mb-3">{icon}</div>
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  )

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="active" className="flex items-center gap-2 text-sm">
          <Clock className="h-3 w-3" />
          Active ({activeOffers.length})
        </TabsTrigger>
        <TabsTrigger value="accepted" className="flex items-center gap-2 text-sm">
          <CheckCircle className="h-3 w-3" />
          Accepted ({acceptedOffers.length})
        </TabsTrigger>
        <TabsTrigger value="other" className="flex items-center gap-2 text-sm">
          <XCircle className="h-3 w-3" />
          Other ({otherOffers.length})
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="active" className="space-y-4 mt-6">
        {activeOffers.length === 0 ? (
          renderEmptyState(<Clock className="h-8 w-8" />, "No active offers")
        ) : (
          <div className="space-y-3">
            {activeOffers.map(offer => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onBuyerAccept={onBuyerAccept}
                onSubmitCounterOffer={onSubmitCounterOffer}
                submitting={submitting}
              />
            ))}
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="accepted" className="space-y-4 mt-6">
        {acceptedOffers.length === 0 ? (
          renderEmptyState(<CheckCircle className="h-8 w-8" />, "No accepted offers yet")
        ) : (
          <div className="space-y-3">
            {acceptedOffers.map(offer => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onBuyerAccept={onBuyerAccept}
                onSubmitCounterOffer={onSubmitCounterOffer}
                submitting={submitting}
              />
            ))}
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="other" className="space-y-4 mt-6">
        {otherOffers.length === 0 ? (
          renderEmptyState(<XCircle className="h-8 w-8" />, "No other offers")
        ) : (
          <div className="space-y-3">
            {otherOffers.map(offer => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onBuyerAccept={onBuyerAccept}
                onSubmitCounterOffer={onSubmitCounterOffer}
                submitting={submitting}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}