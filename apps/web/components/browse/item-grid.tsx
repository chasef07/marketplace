'use client'

import { ItemCard, ViewMode } from './item-card'
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { Item, PaginationInfo } from "@/lib/api-client-new"
import { ItemSkeleton } from "@/components/ui/skeleton"

interface ItemGridProps {
  items: Item[]
  viewMode: ViewMode
  loading: boolean
  error: string | null
  pagination: PaginationInfo | null
  onItemClick?: (itemId: number) => void
  onFavoriteClick?: (itemId: number) => void
  onMessageClick?: (itemId: number) => void
  onPageChange: (page: number) => void
  favoriteItemIds?: number[]
  className?: string
}

interface PaginationControlsProps {
  pagination: PaginationInfo
  onPageChange: (page: number) => void
}

function PaginationControls({ pagination, onPageChange }: PaginationControlsProps) {
  const { page: current_page, total_pages, has_next, has_prev } = pagination

  if (total_pages <= 1) return null

  const getVisiblePages = () => {
    const delta = 2
    const left = current_page - delta
    const right = current_page + delta + 1
    const pages: (number | string)[] = []
    
    for (let i = 1; i <= total_pages; i++) {
      if (i === 1 || i === total_pages || (i >= left && i < right)) {
        pages.push(i)
      } else if (
        (i === left - 1 && left - 1 > 1) ||
        (i === right && right < total_pages)
      ) {
        pages.push('...')
      }
    }
    
    return pages.filter((page, index, arr) => {
      if (page === '...') {
        return arr[index - 1] !== '...'
      }
      return true
    })
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(current_page - 1)}
        disabled={!has_prev}
        className="bg-white/50 border-white/30"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {getVisiblePages().map((page, index) => (
        <span key={`${page}-${index}`}>
          {page === '...' ? (
            <Button variant="ghost" size="sm" disabled className="cursor-default">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant={page === current_page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page as number)}
              className={
                page === current_page
                  ? "bg-white text-gray-900"
                  : "bg-white/50 border-white/30 hover:bg-white/70"
              }
            >
              {page}
            </Button>
          )}
        </span>
      ))}
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(current_page + 1)}
        disabled={!has_next}
        className="bg-white/50 border-white/30"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

function EmptyState({ error }: { error: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 9h.01M15 9h.01M9 15h.01M15 15h.01"
          />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {error ? 'Something went wrong' : 'No items found'}
      </h3>
      
      <p className="text-gray-500 text-center max-w-md">
        {error ? 
          'There was an error loading the marketplace items. Please try again later.' :
          'Try adjusting your search terms or filters to find what you\'re looking for.'
        }
      </p>
      
      {error && (
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      )}
    </div>
  )
}

function LoadingSkeleton({ viewMode }: { viewMode: ViewMode }) {
  const skeletonCount = viewMode === 'grid' ? 12 : 8
  
  return (
    <div className={
      viewMode === 'grid' 
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        : "space-y-4"
    }>
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <ItemSkeleton key={i} />
      ))}
    </div>
  )
}

export function ItemGrid({
  items,
  viewMode,
  loading,
  error,
  pagination,
  onItemClick,
  onFavoriteClick,
  onMessageClick,
  onPageChange,
  favoriteItemIds = [],
  className = ''
}: ItemGridProps) {
  if (loading) {
    return (
      <div className={className}>
        <LoadingSkeleton viewMode={viewMode} />
      </div>
    )
  }

  if (error || items.length === 0) {
    return (
      <div className={className}>
        <EmptyState error={error} />
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Items grid/list */}
      <div className={
        viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          : "space-y-4"
      }>
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            viewMode={viewMode}
            onItemClick={onItemClick}
            onFavoriteClick={onFavoriteClick}
            onMessageClick={onMessageClick}
            isFavorited={favoriteItemIds.includes(item.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <PaginationControls
          pagination={pagination}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}