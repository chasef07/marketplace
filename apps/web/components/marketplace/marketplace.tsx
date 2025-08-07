'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Heart, Star, MapPin, Clock, Plus, Sparkles } from "lucide-react"
import { useState, useEffect } from "react"
import { apiClient, SearchResponse, Item } from "@/lib/api-client-new"
import { AISearchBar } from "@/components/search/ai-search-bar"

interface SellerInfo {
  id: number
  username: string
}

interface User {
  id: number
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
}

export function Marketplace({ user, onCreateListing, onLogout, onItemClick, onSignInClick, onSellerDashboard }: MarketplaceProps) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [isAISearching, setIsAISearching] = useState(false)
  const [searchInterpretation, setSearchInterpretation] = useState<string | null>(null)
  const [isAISearchMode, setIsAISearchMode] = useState(false)


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

  useEffect(() => {
    fetchItems()
  }, [])

  // Add an effect to refresh data when the component mounts (e.g., after navigation)
  useEffect(() => {
    // Force refresh when component becomes visible after navigation
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchItems()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Force immediate refresh on component mount - this ensures new listings appear
    fetchItems()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getMarketplaceItems()
      setItems(response || [])
      setIsAISearchMode(false)
      setSearchInterpretation(null)
    } catch (err) {
      console.error('Error fetching marketplace items:', err)
      setError('Failed to load marketplace items')
    } finally {
      setLoading(false)
    }
  }

  const handleAISearch = async (query: string) => {
    try {
      setIsAISearching(true)
      setLoading(true)
      setError(null)
      setIsAISearchMode(true)
      
      const searchResponse: SearchResponse = await apiClient.aiSearch({ query })
      setItems(searchResponse.items)
      setSearchInterpretation(searchResponse.query_interpretation)
      setSearchQuery(query)
      
    } catch (err) {
      setError('AI search failed. Please try again.')
      console.error('AI search error:', err)
    } finally {
      setIsAISearching(false)
      setLoading(false)
    }
  }

  const handleBackToAllItems = () => {
    setSearchQuery("")
    setSelectedCategory("All")
    fetchItems()
  }

  const filteredItems = isAISearchMode ? items : items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || item.furniture_type === selectedCategory
    return matchesSearch && matchesCategory && item.is_available
  })


  const formatTimeAgo = (timestamp: string) => {
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
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'  
      case 'fair': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

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

      {/* AI Search Hero Section */}
      <section className="py-12" style={{ background: 'linear-gradient(135deg, rgba(247, 243, 233, 0.8) 0%, rgba(232, 221, 212, 0.8) 50%, rgba(221, 209, 199, 0.8) 100%)' }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4" style={{ color: '#3C2415' }}>
              Find Your Perfect Furniture
            </h2>
            <p className="text-xl max-w-2xl mx-auto" style={{ color: '#6B5A47' }}>
              Use natural language to describe what you're looking for. Our AI understands context and finds exactly what you need.
            </p>
          </div>
          
          <AISearchBar 
            onSearch={handleAISearch}
            isLoading={isAISearching}
            className="mb-6"
          />

          {/* Search Interpretation */}
          {searchInterpretation && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm border rounded-xl p-4 flex items-center gap-3" style={{ borderColor: 'rgba(139, 69, 19, 0.2)' }}>
                <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: '#8B4513' }} />
                <p className="text-sm" style={{ color: '#3C2415' }}>
                  <span className="font-medium">AI understood:</span> {searchInterpretation}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToAllItems}
                  className="hover:bg-opacity-10"
                  style={{ color: '#8B4513' }}
                >
                  View All Items
                </Button>
              </div>
            </div>
          )}

          {/* Category Filters - Only show when not in AI search mode */}
          {!isAISearchMode && (
            <div className="max-w-4xl mx-auto mt-8">
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
          )}
        </div>
      </section>

      {/* Listings */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold" style={{ color: '#3C2415' }}>
              {isAISearchMode ? 'AI Search Results' : searchQuery ? `Search results for "${searchQuery}"` : 'Available Items'}
            </h2>
            <p style={{ color: '#6B5A47' }}>
              {isAISearchMode ? `${items.length} items found` : `${filteredItems.length} items found`}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div style={{ color: '#6B5A47' }}>Loading marketplace...</div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 inline-block">
                <p className="text-red-800">{error}</p>
                <Button 
                  onClick={fetchItems}
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
              {filteredItems.map((item) => (
                <Card 
                  key={item.id} 
                  className="bg-white hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => onItemClick && onItemClick(item.id)}>
                  <CardContent className="p-0">
                    {/* Image */}
                    <div className="bg-white border-b h-48 flex items-center justify-center rounded-t-lg overflow-hidden">
                      {item.image_filename ? (
                        <img 
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/furniture-images/${item.image_filename}`}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-6xl">🪑</div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      {/* Price and Heart */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-2xl font-bold" style={{ color: '#3C2415' }}>${item.starting_price.toFixed(2)}</p>
                        </div>
                        <button className="p-2 hover:bg-gray-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <Heart className="h-5 w-5 text-gray-400 hover:text-red-500" />
                        </button>
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
                        <span>{'Local pickup'}</span>
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
        </div>
      </section>
    </div>
  )
}