'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Heart, Star, MapPin, Clock, Plus } from "lucide-react"
import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"

interface FurnitureItem {
  id: number
  name: string
  description: string
  starting_price: number
  min_price: number
  condition: string
  furniture_type: string
  image_path: string | null
  user_id: number
  seller_name: string
  location: string
  created_at: string
  is_sold: boolean
}

interface User {
  id: number
  username: string
  email: string
  full_name: string
}

interface MarketplaceProps {
  user: User | null
  onCreateListing: () => void
  onLogout: () => void
}

export function Marketplace({ user, onCreateListing, onLogout }: MarketplaceProps) {
  const [items, setItems] = useState<FurnitureItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

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

  const fetchItems = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getMarketplaceItems()
      setItems(response.items || [])
    } catch (err) {
      setError('Failed to load marketplace items')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || item.furniture_type === selectedCategory
    return matchesSearch && matchesCategory && !item.is_sold
  })

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const created = new Date(timestamp)
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
    
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">FurnitureMarket</h1>
            
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">Welcome, {user.full_name}!</span>
                  <Button 
                    onClick={onCreateListing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Sell Item
                  </Button>
                  <Button variant="outline" size="sm" onClick={onLogout}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm">Sign In</Button>
                  <Button 
                    onClick={onCreateListing}
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Sell Item
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <section className="bg-white py-8 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search furniture (e.g., vintage sofa, dining table)"
                  className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex justify-center gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
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
            <h2 className="text-2xl font-semibold text-gray-900">
              {searchQuery ? `Search results for "${searchQuery}"` : 'Available Items'}
            </h2>
            <p className="text-gray-600">{filteredItems.length} items found</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="text-gray-500">Loading marketplace...</div>
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
              <div className="text-gray-500 mb-4">
                {searchQuery || selectedCategory !== "All" 
                  ? "No items match your search" 
                  : "No items available yet"}
              </div>
              {!searchQuery && selectedCategory === "All" && (
                <Button 
                  onClick={onCreateListing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Be the first to sell!
                </Button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => (
                <Card key={item.id} className="bg-white hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardContent className="p-0">
                    {/* Image */}
                    <div className="bg-gray-100 h-48 flex items-center justify-center rounded-t-lg overflow-hidden">
                      {item.image_path ? (
                        <img 
                          src={`http://localhost:8000/static/uploads/${item.image_path}`}
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
                          <p className="text-2xl font-bold text-gray-900">${item.starting_price}</p>
                          {item.min_price < item.starting_price && (
                            <p className="text-sm text-gray-500">Min: ${item.min_price}</p>
                          )}
                        </div>
                        <button className="p-2 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <Heart className="h-5 w-5 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{item.name}</h3>

                      {/* Condition */}
                      <div className="mb-2">
                        <span className={`text-sm font-medium capitalize ${getConditionColor(item.condition)}`}>
                          {item.condition} condition
                        </span>
                      </div>

                      {/* Seller and Location */}
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                        <MapPin className="h-4 w-4" />
                        <span>{item.location || 'Local pickup'}</span>
                      </div>

                      {/* Seller Info */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">
                              {item.seller_name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <span className="text-gray-700">{item.seller_name || 'Anonymous'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
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