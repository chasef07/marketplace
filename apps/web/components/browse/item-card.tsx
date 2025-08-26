'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Heart, MessageCircle, Eye, MapPin, Sparkles } from "lucide-react"
import Image from "next/image"
import { Item } from "@/lib/api-client-new"
import { FURNITURE_BLUR_DATA_URL } from "@/lib/blur-data"
import { useState } from "react"

export type ViewMode = 'grid' | 'list'

interface ItemCardProps {
  item: Item
  viewMode: ViewMode
  onItemClick?: (itemId: number) => void
  onFavoriteClick?: (itemId: number) => void
  onMessageClick?: (itemId: number) => void
  isFavorited?: boolean
  className?: string
}

interface User {
  id: string
  username: string
  seller_personality?: string
}

export function ItemCard({
  item,
  viewMode,
  onItemClick,
  onFavoriteClick,
  onMessageClick,
  isFavorited = false,
  className = ''
}: ItemCardProps) {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  
  // Use real seller data from the API response
  const seller = item.seller || { 
    id: item.seller_id, 
    username: 'Unknown User', 
    seller_personality: 'friendly' 
  }
  const negotiationProgress = item.item_status === 'under_negotiation' ? 65 : 0

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const created = new Date(timestamp)
    const diffMs = now.getTime() - created.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    return 'Just now'
  }

  const getStatusBadge = () => {
    switch (item.item_status) {
      case 'under_negotiation':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">In Negotiation</Badge>
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Available</Badge>
      default:
        return null
    }
  }

  const isNewListing = () => {
    const hoursSinceCreated = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60)
    return hoursSinceCreated < 24
  }

  if (viewMode === 'list') {
    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-lg bg-white/50 backdrop-blur-sm border-white/20 ${className}`}
        onClick={() => onItemClick?.(item.id)}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Image */}
            <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
              {!imageError && item.image_url && item.image_url.trim() ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={FURNITURE_BLUR_DATA_URL}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageError(true)
                    setImageLoading(false)
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No Image
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-gray-900 truncate pr-2">{item.name}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-lg font-bold text-gray-900">${item.starting_price}</div>
                  <div className="flex gap-1">
                    {getStatusBadge()}
                    {isNewListing() && <Badge className="bg-orange-100 text-orange-700">New</Badge>}
                    {item.ai_agent_enabled && (
                      <Badge className="bg-purple-100 text-purple-700">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-xs">
                        {seller.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-20">{seller.username}</span>
                  </div>
                  
                  {item.zip_code && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{item.zip_code}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{item.views || 0}</span>
                  </div>
                  
                  <span>{formatTimeAgo(item.created_at)}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFavoriteClick?.(item.id)
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMessageClick?.(item.id)
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {negotiationProgress > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Negotiation Progress</span>
                    <span>{negotiationProgress}%</span>
                  </div>
                  <Progress value={negotiationProgress} className="h-1" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Grid view
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-white/50 backdrop-blur-sm border-white/20 ${className}`}
      onClick={() => onItemClick?.(item.id)}
    >
      <CardContent className="p-0">
        {/* Image container */}
        <div className="relative w-full aspect-square rounded-t-lg overflow-hidden bg-gray-100">
          {!imageError && item.image_url && item.image_url.trim() ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-cover"
              placeholder="blur"
              blurDataURL={FURNITURE_BLUR_DATA_URL}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true)
                setImageLoading(false)
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image Available
            </div>
          )}
          
          {/* Overlay badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {isNewListing() && <Badge className="bg-orange-100 text-orange-700 text-xs">New</Badge>}
            {item.ai_agent_enabled && (
              <Badge className="bg-purple-100 text-purple-700 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Badge>
            )}
          </div>

          {/* Favorite button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onFavoriteClick?.(item.id)
            }}
            className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/70 hover:bg-white/90"
          >
            <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-gray-900 truncate pr-2">{item.name}</h3>
            <div className="text-lg font-bold text-gray-900 flex-shrink-0">${item.starting_price}</div>
          </div>

          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>

          {/* Status and progress */}
          <div className="mb-3">
            {getStatusBadge()}
            {negotiationProgress > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Negotiation Progress</span>
                  <span>{negotiationProgress}%</span>
                </div>
                <Progress value={negotiationProgress} className="h-1" />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {seller.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-gray-600 truncate max-w-16">{seller.username}</span>
            </div>

            <div className="flex items-center gap-3 text-gray-500">
              {item.zip_code && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="text-xs">{item.zip_code}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span className="text-xs">{item.views || 0}</span>
              </div>
              
              <span className="text-xs">{formatTimeAgo(item.created_at)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onMessageClick?.(item.id)
              }}
              className="flex-1 bg-white/50"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}