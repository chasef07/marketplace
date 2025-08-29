'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Eye, MapPin } from "lucide-react"
import Image from "next/image"
import { Item } from "@/lib/api-client-new"
import { FURNITURE_BLUR_DATA_URL } from "@/lib/blur-data"
import { useState } from "react"
import { createClient } from "@/lib/supabase"

export type ViewMode = 'grid' | 'list'

interface ItemCardProps {
  item: Item
  viewMode: ViewMode
  onItemClick?: (itemId: number) => void
  className?: string
}


export function ItemCard({
  item,
  viewMode,
  onItemClick,
  className = ''
}: ItemCardProps) {
  const [imageError, setImageError] = useState(false)
  
  // Get the correct image URL using the same logic as profile utilities
  const getItemImageUrl = (item: Item): string | null => {
    const supabase = createClient()
    const primaryImage = item.images?.find(img => img.is_primary) || item.images?.[0]
    const filename = primaryImage?.filename || item.image_filename
    
    if (!filename) return null
    
    const { data } = supabase.storage.from('furniture-images').getPublicUrl(filename)
    return data.publicUrl
  }
  
  // Use real seller data from the API response
  const seller = item.seller || { 
    id: item.seller_id, 
    username: 'Unknown User', 
    seller_personality: 'friendly' 
  }

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
              {!imageError && getItemImageUrl(item) ? (
                <Image
                  src={getItemImageUrl(item)!}
                  alt={item.name}
                  fill
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={FURNITURE_BLUR_DATA_URL}
                  onError={() => setImageError(true)}
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
                <div className="text-lg font-bold text-gray-900">${item.starting_price}</div>
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

              </div>

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
          {!imageError && getItemImageUrl(item) ? (
            <Image
              src={getItemImageUrl(item)!}
              alt={item.name}
              fill
              className="object-cover"
              placeholder="blur"
              blurDataURL={FURNITURE_BLUR_DATA_URL}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image Available
            </div>
          )}
          

        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-gray-900 truncate pr-2">{item.name}</h3>
            <div className="text-lg font-bold text-gray-900 flex-shrink-0">${item.starting_price}</div>
          </div>

          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>


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

        </div>
      </CardContent>
    </Card>
  )
}