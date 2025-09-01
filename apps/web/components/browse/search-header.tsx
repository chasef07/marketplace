'use client'

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, Grid3x3, List, X } from "lucide-react"

export type SortOption = 'newest' | 'price_low' | 'price_high'
export type ViewMode = 'grid' | 'list'

interface SearchHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  totalItems: number
  loading?: boolean
}

export function SearchHeader({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  totalItems,
  loading = false
}: SearchHeaderProps) {
  return (
    <div className="sticky top-20 z-10 bg-white/85 backdrop-blur-md border-b border-slate-200/20 shadow-lg">
      <div className="max-w-7xl mx-auto p-4">
        {/* Main search and controls row */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          {/* Search input */}
          <div className="relative flex-1 min-w-0">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              placeholder="Search home goods..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-white/90 border-white/60 focus:border-white/80 focus:ring-white/30"
              disabled={loading}
            />
          </div>

          {/* Controls group */}
          <div className="flex gap-2 items-center flex-shrink-0">
            {/* Sort selector */}
            <Select value={sortBy} onValueChange={onSortChange} disabled={loading}>
              <SelectTrigger className="w-[140px] bg-white/90 border-white/60">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 border-white/70 backdrop-blur-md shadow-lg">
                <SelectItem value="newest">Newest Items</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6" />

            {/* View mode toggle */}
            <div className="flex rounded-lg bg-white/90 border border-white/60 p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className="px-2"
                disabled={loading}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                className="px-2"
                disabled={loading}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

          </div>
        </div>

        {/* Results count and search badge */}
        <div className="flex flex-wrap gap-2 items-center mt-3">
          <span className="text-sm text-muted-foreground">
            {loading ? 'Searching...' : `${totalItems} items found`}
          </span>
          
          {searchQuery && (
            <Badge variant="secondary" className="bg-white/90 border-white/60">
              Search: "{searchQuery}"
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSearchChange('')}
                className="h-auto p-0 ml-1 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}