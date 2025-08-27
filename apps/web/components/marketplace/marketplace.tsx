'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Plus } from "lucide-react"
import { useState, useEffect, useMemo, useCallback } from "react"
import useSWR from 'swr'
import { useDebouncedCallback } from 'use-debounce'
import { Item, PaginationInfo } from "@/lib/api-client-new"
import { FURNITURE_BLUR_DATA_URL } from "@/lib/blur-data"
import Image from "next/image"
import { ItemSkeleton } from "@/components/ui/skeleton"
import { getRotatingGreeting } from "@/lib/greetings"


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

interface MarketplaceProps {
  user: User | null
  onCreateListing: () => void
  onLogout: () => void
  onItemClick?: (itemId: number) => void
  onSignInClick?: () => void
  onViewProfile?: () => void
}

// Fetcher function for SWR with better error handling
const fetcher = async (url: string) => {
  console.log('Fetching URL:', url)
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-cache'
    })
    console.log('Fetch response status:', res.status, res.statusText)
    
    if (!res.ok) {
      const errorData = await res.text()
      console.error('Fetch error response:', errorData)
      throw new Error(`Failed to fetch: ${res.status} ${res.statusText} - ${errorData}`)
    }
    
    const data = await res.json()
    console.log('Fetched data:', data)
    return data
  } catch (error) {
    console.error('Fetch exception:', error)
    throw error
  }
}

export function Marketplace({ user, onCreateListing, onLogout, onItemClick, onSignInClick, onViewProfile }: MarketplaceProps) {
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [selectedPriceRange, setSelectedPriceRange] = useState("all")

  // Debounce search input to avoid excessive filtering
  const debouncedSearch = useDebouncedCallback(
    (value: string) => setSearchQuery(value),
    300
  )

  useEffect(() => {
    debouncedSearch(searchInput)
  }, [searchInput, debouncedSearch])
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 12,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  })

  // Add a timestamp to force fresh data when needed
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now())
  
  // Construct SWR key
  const swrKey = `/api/items?page=${currentPage}&limit=12&_t=${refreshTimestamp}`
  
  // Use SWR for data fetching with caching
  const { data, error: swrError, mutate } = useSWR(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Reduced dedupe interval
      errorRetryCount: 2,
      errorRetryInterval: 1000,
      onError: (error) => {
        console.error('SWR Error:', error)
      },
      onSuccess: (data) => {
        console.log('SWR Success:', data)
      }
    }
  )

  // Add effect to force fresh data when component mounts (for refresh after new listings)
  useEffect(() => {
    // Force fresh data by updating timestamp - this bypasses all caching
    setRefreshTimestamp(Date.now())
  }, [])

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
    console.log('SWR Debug:', { 
      swrKey, 
      data: data ? 'loaded' : 'null', 
      swrError: swrError ? swrError.message : 'null', 
      loading,
      itemsLength: data?.items?.length || 0
    })
    
    if (swrError) {
      console.error('SWR Error details:', swrError)
      setError(`Failed to load marketplace items: ${swrError.message}`)
    } else if (data) {
      setError(null)
    }
  }, [swrError, data, loading, swrKey])

  // Function to refresh data (replaces fetchItems)
  const refreshItems = useCallback(() => {
    setRefreshTimestamp(Date.now())
    mutate()
  }, [mutate])

  // Function to change page
  const changePage = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])



  // Memoize expensive filtering operation
  const filteredItems = useMemo(() => {
    return items.filter((item: Item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Price range filter
      let matchesPrice = true
      if (selectedPriceRange !== "all") {
        const price = item.starting_price
        switch (selectedPriceRange) {
          case "0-100":
            matchesPrice = price < 100
            break
          case "100-300":
            matchesPrice = price >= 100 && price < 300
            break
          case "300-500":
            matchesPrice = price >= 300 && price < 500
            break
          case "500-1000":
            matchesPrice = price >= 500 && price < 1000
            break
          case "1000+":
            matchesPrice = price >= 1000
            break
        }
      }
      
      return matchesSearch && matchesPrice && (item.item_status === 'active' || item.item_status === 'under_negotiation')
    })
  }, [items, searchQuery, selectedPriceRange])


  // Memoize time formatting function
  const formatTimeAgo = useCallback((timestamp: string) => {
    const now = new Date()
    const created = new Date(timestamp)
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
    
    if (diffMinutes < 0) return 'Just now'
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d ago`
    
    const diffMonths = Math.floor(diffDays / 30)
    return `${diffMonths}mo ago`
  }, [])


  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-slate-800">SnapNest</div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-blue-600 text-sm font-medium">{getRotatingGreeting(user.id)}, {user.username}!</span>
                  <Button variant="ghost" onClick={onCreateListing}>
                    Sell
                  </Button>
                  <Button variant="ghost" onClick={onViewProfile}>
                    Profile
                  </Button>
                  <Button variant="ghost" onClick={onLogout}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={onCreateListing}>
                    Sell
                  </Button>
                  <Button variant="ghost" onClick={onSignInClick}>
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search and Category Section */}
      <section className="search-section">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#2C3E50' }}>
              Browse Furniture
            </h2>
          </div>
          
          {/* Enhanced Search Bar with Price Filter */}
          <div className="max-w-3xl mx-auto mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search furniture..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Price Range Filter */}
                <div className="min-w-36">
                  <select
                    value={selectedPriceRange}
                    onChange={(e) => setSelectedPriceRange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="all">All Prices</option>
                    <option value="0-100">Under $100</option>
                    <option value="100-300">$100 - $300</option>
                    <option value="300-500">$300 - $500</option>
                    <option value="500-1000">$500 - $1000</option>
                    <option value="1000+">$1000+</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
              {searchQuery ? `Search results for "${searchQuery}"` : 'Available Items'}
            </h2>
            <p style={{ color: '#6B7280' }}>
              {filteredItems.length} items found
            </p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <ItemSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 inline-block">
                <p className="text-red-800">{error}</p>
                <Button 
                  onClick={refreshItems}
                  className="mt-2 bg-red-600 hover:bg-red-700"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4" style={{ color: '#6B7280' }}>
                {searchQuery 
                  ? "No items match your search" 
                  : "No items available yet"}
              </div>
              {!searchQuery && (
                <Button 
                  onClick={onCreateListing}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Be the first to sell!
                </Button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item: Item) => (
                <Card 
                  key={item.id} 
                  className="bg-white hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => onItemClick && onItemClick(item.id)}>
                  <CardContent className="p-0">
                    {/* Image */}
                    <div className="bg-white border-b h-48 flex items-center justify-center rounded-t-lg overflow-hidden relative">
                      {(() => {
                        // Get the primary image - prefer new format, fall back to old
                        let imageUrl = null
                        if (item.images && item.images.length > 0) {
                          // Find primary image or use first image
                          const primaryImage = item.images.find((img: {is_primary?: boolean, filename: string}) => img.is_primary) || item.images[0]
                          imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/furniture-images/${primaryImage.filename}`
                        } else if (item.image_filename) {
                          imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/furniture-images/${item.image_filename}`
                        }
                        
                        return imageUrl ? (
                          <Image 
                            src={imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                            placeholder="blur"
                            blurDataURL={FURNITURE_BLUR_DATA_URL}
                            quality={85}
                            priority={false}
                          />
                        ) : (
                          <div className="text-6xl">🪑</div>
                        )
                      })()}
                    </div>
                    
                    <div className="p-4">
                      {/* Price */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-2xl font-bold" style={{ color: '#2C3E50' }}>${item.starting_price.toFixed(2)}</p>
                        </div>
                        {/* Agent Status Indicator */}
                        {item.agent_enabled && (
                          <div className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            🤖 AI Agent
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold mb-2 line-clamp-2" style={{ color: '#2C3E50' }}>{item.name}</h3>


                      {/* Seller Info */}
                      <div className="flex items-center text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(139, 69, 19, 0.1)' }}>
                            <span className="text-xs font-medium" style={{ color: '#4A6FA5' }}>
                              {(item.seller?.username || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span style={{ color: '#2C3E50' }}>{item.seller?.username || 'Anonymous'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => changePage(pagination.page - 1)}
                disabled={!pagination.has_prev || loading}
                className="text-sm"
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                {(() => {
                  const maxVisiblePages = 5
                  const totalPages = pagination.total_pages
                  const currentPage = pagination.page
                  
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
                  
                  // Adjust startPage if we're near the end
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1)
                  }
                  
                  const pages = []
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i)
                  }
                  
                  return pages.map((pageNum) => (
                    <Button
                      key={`page-${pageNum}`}
                      variant={pagination.page === pageNum ? "default" : "outline"}
                      onClick={() => changePage(pageNum)}
                      disabled={loading}
                      className="w-10 h-10 text-sm"
                      className={pagination.page === pageNum ? 'bg-blue-600 text-white' : ''}
                    >
                      {pageNum}
                    </Button>
                  ))
                })()}
              </div>
              
              <Button
                variant="outline"
                onClick={() => changePage(pagination.page + 1)}
                disabled={!pagination.has_next || loading}
                className="text-sm"
              >
                Next
              </Button>
              
              <div className="text-sm text-gray-600 ml-4">
                Page {pagination.page} of {pagination.total_pages} ({pagination.total} items)
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
