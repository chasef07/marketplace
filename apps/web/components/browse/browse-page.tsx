'use client'

import { useState, useEffect, useMemo, useCallback } from "react"
import useSWR from 'swr'
import { useDebouncedCallback } from 'use-debounce'
import { SearchHeader, SortOption, ViewMode } from './search-header'
import { ItemGrid } from './item-grid'
import { PaginationInfo } from "@/lib/api-client-new"
import { MainNavigation } from "../navigation/MainNavigation"
import { User } from "@/lib/types/user"

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
  const [sortBy, setSortBy] = useState<SortOption>('price_low')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  

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
      limit: '20'
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
      default:
        params.set('sort', 'price_asc')
        break
    }


    return `/api/items?${params.toString()}`
  }, [currentPage, debouncedSearchQuery, sortBy])

  // SWR data fetching
  const { data, error: swrError } = useSWR(
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


  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleItemClick = useCallback((itemId: number) => {
    onItemClick?.(itemId)
  }, [onItemClick])



  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Main Navigation Header */}
      <MainNavigation
        user={user}
        onCreateListing={onCreateListing}
        onViewProfile={onViewProfile}
        onSignIn={onSignInClick}
        onSignOut={onLogout}
        currentPage="browse"
      />
      
      {/* Search Header */}
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        totalItems={data?.total || 0}
        loading={loading}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <ItemGrid
          items={items}
          viewMode={viewMode}
          loading={loading}
          error={error}
          pagination={pagination}
          onItemClick={handleItemClick}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  )
}