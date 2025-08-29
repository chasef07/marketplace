'use client'

import { Button } from '@/components/ui/button'
import { ShoppingBag, AlertCircle } from 'lucide-react'

interface EmptyStateProps {
  type: 'empty' | 'error'
  message: string
  onRetry?: () => void
}

export default function EmptyState({ type, message, onRetry }: EmptyStateProps) {
  if (type === 'error') {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <p className="text-red-600 mb-4">{message}</p>
        {onRetry && (
          <Button onClick={onRetry}>Try Again</Button>
        )}
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <ShoppingBag className="mx-auto h-12 w-12 text-slate-400 mb-4" />
      <h3 className="text-lg font-medium text-slate-900 mb-2">No offers yet</h3>
      <p className="text-slate-500">
        {message || "Browse the marketplace to find items you're interested in and make your first offer!"}
      </p>
    </div>
  )
}