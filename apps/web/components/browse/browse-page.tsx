'use client'

import { useState, useEffect, useMemo, useCallback } from "react"
import useSWR from 'swr'
import { useDebouncedCallback } from 'use-debounce'
import { SearchHeader, SortOption, ViewMode } from './search-header'
import { FilterSidebar, FilterOptions } from './filter-sidebar'
import { ItemGrid } from './item-grid'
import { Item, PaginationInfo } from "@/src/lib/api-client-new"
import { colors, gradients } from '../home/design-system/colors'

interface User {
  id: string
  username: string
  email: string
  seller_personality: string
  buyer_personality: string
  is_active: boolean
  created_at: string
  last_login?: string
}

interface BrowsePageProps {
  user: User | null
  onCreateListing: () => void
  onLogout: () => void
  onItemClick?: (itemId: number) => void
  onSignInClick?: () => void
  onViewProfile?: () => void
}

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-cache'
  })
  
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`)
  }
  
  return res.json()
}

export function BrowsePage({
  user,
  onCreateListing,
  onLogout,
  onItemClick,
  onSignInClick,
  onViewProfile
}: BrowsePageProps) {
  // State management
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now())
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    furnitureTypes: [],
    conditions: [],
    priceRange: [0, 10000],
    maxPrice: 10000,
    features: []
  })

  // Debounced search
  const debouncedSearch = useDebouncedCallback((query: string) => {
    setDebouncedSearchQuery(query)
    setCurrentPage(1) // Reset to first page on search
  }, 500)

  useEffect(() => {
    debouncedSearch(searchQuery)
  }, [searchQuery, debouncedSearch])

  // Build API URL with parameters
  const buildApiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: '20',
      refresh: refreshTimestamp.toString()
    })

    if (debouncedSearchQuery.trim()) {
      params.set('search', debouncedSearchQuery.trim())
    }

    // Add sorting
    switch (sortBy) {
      case 'price_low':
        params.set('sort', 'price_asc')
        break
      case 'price_high':
        params.set('sort', 'price_desc')
        break
      case 'most_viewed':
        params.set('sort', 'views_desc')
        break
      case 'newest':
      default:
        params.set('sort', 'created_desc')
        break
    }

    // Add filter parameters
    if (filters.categories.length > 0) {
      params.set('categories', filters.categories.join(','))
    }
    if (filters.furnitureTypes.length > 0) {
      params.set('furniture_types', filters.furnitureTypes.join(','))
    }
    if (filters.conditions.length > 0) {
      params.set('conditions', filters.conditions.join(','))
    }
    if (filters.priceRange[0] > 0) {
      params.set('min_price', filters.priceRange[0].toString())
    }
    if (filters.priceRange[1] < filters.maxPrice) {
      params.set('max_price', filters.priceRange[1].toString())
    }
    if (filters.features.length > 0) {
      params.set('features', filters.features.join(','))
    }

    return `/api/items?${params.toString()}`
  }, [currentPage, debouncedSearchQuery, sortBy, filters, refreshTimestamp])

  // SWR data fetching
  const { data, error: swrError, mutate } = useSWR(
    buildApiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      errorRetryCount: 2,
      errorRetryInterval: 1000,
    }
  )

  const loading = !data && !swrError
  const items = data?.items || []

  // Update pagination when data changes
  useEffect(() => {
    if (data?.pagination) {
      setPagination(data.pagination)
    }
  }, [data])

  // Update error state from SWR
  useEffect(() => {
    if (swrError) {
      setError(`Failed to load marketplace items: ${swrError.message}`)
    } else if (data) {
      setError(null)
    }
  }, [swrError, data])

  // Handlers
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleSortChange = useCallback((sort: SortOption) => {
    setSortBy(sort)
    setCurrentPage(1)
  }, [])

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
  }, [])

  const handleToggleFilters = useCallback(() => {
    setShowFilters(prev => !prev)
  }, [])

  const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleItemClick = useCallback((itemId: number) => {
    onItemClick?.(itemId)
  }, [onItemClick])

  const handleFavoriteClick = useCallback((itemId: number) => {
    // TODO: Implement favorite functionality
    console.log('Favorite clicked:', itemId)
  }, [])

  const handleMessageClick = useCallback((itemId: number) => {
    // TODO: Implement message functionality
    console.log('Message clicked:', itemId)
  }, [])

  // Get active filters for display
  const getActiveFilters = useMemo(() => {
    const activeFilters: string[] = []
    
    if (filters.categories.length > 0) {
      activeFilters.push(...filters.categories.map(c => `Category: ${c}`))
    }
    if (filters.furnitureTypes.length > 0) {
      activeFilters.push(...filters.furnitureTypes.map(f => `Type: ${f}`))
    }
    if (filters.conditions.length > 0) {
      activeFilters.push(...filters.conditions.map(c => `Condition: ${c}`))
    }
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < filters.maxPrice) {
      activeFilters.push(`Price: $${filters.priceRange[0]} - $${filters.priceRange[1]}`)
    }
    if (filters.features.length > 0) {
      activeFilters.push(...filters.features)
    }
    
    return activeFilters
  }, [filters])

  const handleRemoveFilter = useCallback((filterToRemove: string) => {
    const newFilters = { ...filters }
    
    // Parse and remove the specific filter
    if (filterToRemove.startsWith('Category: ')) {
      const category = filterToRemove.replace('Category: ', '')
      newFilters.categories = newFilters.categories.filter(c => c !== category)
    } else if (filterToRemove.startsWith('Type: ')) {
      const type = filterToRemove.replace('Type: ', '')
      newFilters.furnitureTypes = newFilters.furnitureTypes.filter(t => t !== type)
    } else if (filterToRemove.startsWith('Condition: ')) {
      const condition = filterToRemove.replace('Condition: ', '')
      newFilters.conditions = newFilters.conditions.filter(c => c !== condition)
    } else if (filterToRemove.startsWith('Price: ')) {
      newFilters.priceRange = [0, newFilters.maxPrice]
    } else {
      // Features
      newFilters.features = newFilters.features.filter(f => f !== filterToRemove)
    }
    
    setFilters(newFilters)
  }, [filters])

  return (
    <div 
      className="min-h-screen"
      style={{
        background: gradients.background
      }}
    >
      {/* Search Header */}
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        showFilters={showFilters}
        onToggleFilters={handleToggleFilters}
        activeFilters={getActiveFilters}
        onRemoveFilter={handleRemoveFilter}
        totalItems={data?.total || 0}
        loading={loading}
      />

      <div className="flex">
        {/* Filter Sidebar */}
        <FilterSidebar
          isOpen={showFilters}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        {/* Main Content */}
        <div className={`flex-1 p-6 ${showFilters ? 'max-w-none' : 'max-w-7xl mx-auto'}`}>
          <ItemGrid
            items={items}
            viewMode={viewMode}
            loading={loading}
            error={error}
            pagination={pagination}
            onItemClick={handleItemClick}
            onFavoriteClick={handleFavoriteClick}
            onMessageClick={handleMessageClick}
            onPageChange={handlePageChange}
            favoriteItemIds={[]} // TODO: Implement favorites
          />
        </div>
      </div>
    </div>
  )
}