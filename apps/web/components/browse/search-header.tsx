'use client'

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, SlidersHorizontal, Grid3x3, List, X } from "lucide-react"

export type SortOption = 'newest' | 'price_low' | 'price_high' | 'most_viewed'
export type ViewMode = 'grid' | 'list'

interface SearchHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  showFilters: boolean
  onToggleFilters: () => void
  activeFilters: string[]
  onRemoveFilter: (filter: string) => void
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
  showFilters,
  onToggleFilters,
  activeFilters,
  onRemoveFilter,
  totalItems,
  loading = false
}: SearchHeaderProps) {
  return (
    <div 
      className="sticky top-0 z-10 backdrop-blur-md border-b"
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 32px -8px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="max-w-7xl mx-auto p-4">
        {/* Main search and controls row */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          {/* Search input */}
          <div className="relative flex-1 min-w-0">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              placeholder="Search furniture..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-white/50 border-white/30 focus:border-white/50 focus:ring-white/20"
              disabled={loading}
            />
          </div>

          {/* Controls group */}
          <div className="flex gap-2 items-center flex-shrink-0">
            {/* Sort selector */}
            <Select value={sortBy} onValueChange={onSortChange} disabled={loading}>
              <SelectTrigger className="w-[140px] bg-white/50 border-white/30">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_low">Price: Low</SelectItem>
                <SelectItem value="price_high">Price: High</SelectItem>
                <SelectItem value="most_viewed">Most Viewed</SelectItem>
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6" />

            {/* View mode toggle */}
            <div className="flex rounded-lg bg-white/50 border border-white/30 p-1">
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

            <Separator orientation="vertical" className="h-6" />

            {/* Filter toggle */}
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              onClick={onToggleFilters}
              className="bg-white/50 border-white/30 hover:bg-white/70"
              disabled={loading}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Active filters and results count */}
        {(activeFilters.length > 0 || searchQuery) && (
          <>
            <div className="flex flex-wrap gap-2 items-center mt-3">
              <span className="text-sm text-muted-foreground">
                {loading ? 'Searching...' : `${totalItems} items`}
              </span>
              
              {searchQuery && (
                <Badge variant="secondary" className="bg-white/50">
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
              
              {activeFilters.map((filter) => (
                <Badge key={filter} variant="secondary" className="bg-white/50">
                  {filter}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFilter(filter)}
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              
              {(activeFilters.length > 1 || (activeFilters.length > 0 && searchQuery)) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    activeFilters.forEach(onRemoveFilter)
                    onSearchChange('')
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}