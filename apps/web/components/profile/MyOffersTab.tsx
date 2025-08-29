'use client'

import { useEffect } from 'react'
import { useOffers } from './offers/useOffers'
import { MyOffersTabProps } from './offers/types'
import OfferTabs from './offers/OfferTabs'
import EmptyState from './offers/EmptyState'
import LoadingState from './offers/LoadingState'

export default function MyOffersTab({ userId, onOfferConfirmed, initialOfferItemId }: MyOffersTabProps) {
  const {
    offers,
    loading,
    error,
    submitting,
    fetchOffers,
    submitCounterOffer,
    buyerAcceptOffer
  } = useOffers(userId)

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  const handleSubmitCounterOffer = async (itemId: number, price: string, message: string) => {
    try {
      await submitCounterOffer(itemId, price, message)
      onOfferConfirmed?.()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit offer')
    }
  }

  const handleBuyerAccept = async (negotiationId: number) => {
    try {
      await buyerAcceptOffer(negotiationId)
      onOfferConfirmed?.()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to accept offer')
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <EmptyState type="error" message={error} onRetry={fetchOffers} />
  }

  if (offers.length === 0) {
    return <EmptyState type="empty" message="Browse the marketplace to find items you're interested in and make your first offer!" />
  }

  return (
    <div className="space-y-6">
      <OfferTabs
        offers={offers}
        onBuyerAccept={handleBuyerAccept}
        onSubmitCounterOffer={handleSubmitCounterOffer}
        submitting={submitting}
      />
    </div>
  )
}