'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Heart, Star, MapPin, Clock, Plus, Bot } from "lucide-react"
import { useState, useEffect, useMemo, useCallback } from "react"
import useSWR from 'swr'
import { useDebouncedCallback } from 'use-debounce'
import { apiClient, Item, PaginationInfo } from "@/lib/api-client-new"
import { FURNITURE_BLUR_DATA_URL } from "@/lib/blur-data"
import Image from "next/image"
import { ItemSkeleton } from "@/components/ui/skeleton"


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
  onSellerDashboard?: () => void
  onSellerChat?: () => void
  onViewProfile?: () => void
}

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json())

export function Marketplace({ user, onCreateListing, onLogout, onItemClick, onSignInClick, onSellerDashboard, onSellerChat, onViewProfile }: MarketplaceProps) {
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

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
  
  // Use SWR for data fetching with caching
  const { data, error: swrError, mutate } = useSWR(
    `/api/items?page=${currentPage}&limit=12&_t=${refreshTimestamp}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Reduced dedupe interval
      errorRetryCount: 3,
      errorRetryInterval: 5000
    }
  )

  // Add effect to force fresh data when component mounts (for refresh after new listings)
  useEffect(() => {
    // Force fresh data by updating timestamp - this bypasses all caching
    setRefreshTimestamp(Date.now())
  }, [])

  const loading = !data && !swrError
  const items = data?.items || []


  const categories = ["All", "couch", "chair", "dining_table", "bookshelf", "dresser", "other"]
  
  const categoryDisplayNames: Record<string, string> = {
    "All": "All",
    "couch": "Couches",
    "chair": "Chairs", 
    "dining_table": "Dining Tables",
    "bookshelf": "Bookshelves",
    "dresser": "Dressers",
    "other": "Other"
  }

  // Update pagination when data changes
  useEffect(() => {
    if (data?.pagination) {
      setPagination(data.pagination)
    }
  }, [data])

  // Update error state from SWR
  useEffect(() => {
    if (swrError) {
      setError('Failed to load marketplace items')
    } else {
      setError(null)
    }
  }, [swrError])

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
      const matchesCategory = selectedCategory === "All" || item.furniture_type === selectedCategory
      return matchesSearch && matchesCategory && item.is_available
    })
  }, [items, searchQuery, selectedCategory])


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

  // Memoize condition color mapping
  const getConditionColor = useCallback((condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'  
      case 'fair': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F7F3E9 0%, #E8DDD4 50%, #DDD1C7 100%)' }}>
      {/* Header */}
      <header className="backdrop-blur-md border-b sticky top-0 z-50" style={{ background: 'rgba(247, 243, 233, 0.9)', borderColor: 'rgba(139, 69, 19, 0.1)' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold" style={{ color: '#3C2415' }}>FurnitureMarket</h1>
            
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm" style={{ color: '#6B5A47' }}>
                    Welcome, {user.username}!
                  </span>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={onSellerDashboard}
                    className="hover:bg-opacity-10"
                    style={{ borderColor: '#8B4513', color: '#8B4513' }}
                  >
                    Dashboard
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={onViewProfile}
                    className="hover:bg-opacity-10"
                    style={{ borderColor: '#8B4513', color: '#8B4513' }}
                  >
                    Profile
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={onSellerChat}
                    className="hover:bg-opacity-10"
                    style={{ borderColor: '#8B4513', color: '#8B4513' }}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    AI Assistant
                  </Button>
                  <Button 
                    onClick={onCreateListing}
                    className="hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #8B4513, #CD853F)', color: '#F7F3E9' }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Sell Item
                  </Button>
                  <Button variant="outline" size="sm" onClick={onLogout} style={{ borderColor: '#8B4513', color: '#8B4513' }}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={onSignInClick} style={{ borderColor: '#8B4513', color: '#8B4513' }}>
                    Sign In
                  </Button>
                  <Button 
                    onClick={onCreateListing}
                    size="sm" 
                    className="hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #8B4513, #CD853F)', color: '#F7F3E9' }}
                  >
                    Sell Item
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search and Category Section */}
      <section className="py-8" style={{ background: 'linear-gradient(135deg, rgba(247, 243, 233, 0.8) 0%, rgba(232, 221, 212, 0.8) 50%, rgba(221, 209, 199, 0.8) 100%)' }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#3C2415' }}>
              Browse Furniture
            </h2>
          </div>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search furniture..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'text-white shadow-lg'
                      : 'bg-white/80 backdrop-blur-sm border text-gray-700 hover:bg-white hover:shadow-md'
                  }`}
                  style={selectedCategory === category ? 
                    { background: 'linear-gradient(135deg, #8B4513, #CD853F)', color: '#F7F3E9' } : 
                    { borderColor: 'rgba(139, 69, 19, 0.2)' }
                  }
                >
                  {categoryDisplayNames[category]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold" style={{ color: '#3C2415' }}>
              {searchQuery ? `Search results for "${searchQuery}"` : 'Available Items'}
            </h2>
            <p style={{ color: '#6B5A47' }}>
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
              <div className="mb-4" style={{ color: '#6B5A47' }}>
                {searchQuery || selectedCategory !== "All" 
                  ? "No items match your search" 
                  : "No items available yet"}
              </div>
              {!searchQuery && selectedCategory === "All" && (
                <Button 
                  onClick={onCreateListing}
                  className="hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #8B4513, #CD853F)', color: '#F7F3E9' }}
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
                          const primaryImage = item.images.find((img: any) => img.is_primary) || item.images[0]
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
                          <p className="text-2xl font-bold" style={{ color: '#3C2415' }}>${item.starting_price.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold mb-2 line-clamp-2" style={{ color: '#3C2415' }}>{item.name}</h3>

                      {/* Condition */}
                      <div className="mb-2">
                        <span className={`text-sm font-medium capitalize ${getConditionColor(item.condition)}`}>
                          {item.condition} condition
                        </span>
                      </div>

                      {/* Seller and Location */}
                      <div className="flex items-center gap-1 text-sm mb-2" style={{ color: '#6B5A47' }}>
                        <MapPin className="h-4 w-4" />
                        <span>{item.seller?.zip_code ? `Near ${item.seller.zip_code}` : 'Local pickup'}</span>
                      </div>

                      {/* Seller Info */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(139, 69, 19, 0.1)' }}>
                            <span className="text-xs font-medium" style={{ color: '#8B4513' }}>
                              {(item.seller?.username || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span style={{ color: '#3C2415' }}>{item.seller?.username || 'Anonymous'}</span>
                        </div>
                        <div className="flex items-center gap-1" style={{ color: '#6B5A47' }}>
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(item.created_at)}</span>
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
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
                  
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
                      style={pagination.page === pageNum ? {
                        background: 'linear-gradient(135deg, #8B4513, #CD853F)',
                        color: '#F7F3E9'
                      } : {}}
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