'use client'

import { useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react"

export interface FilterOptions {
  categories: string[]
  furnitureTypes: string[]
  conditions: string[]
  priceRange: [number, number]
  maxPrice: number
  features: string[]
}

interface FilterSidebarProps {
  isOpen: boolean
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  className?: string
}

const FURNITURE_TYPES = [
  'Couch', 'Dining Table', 'Bookshelf', 'Chair', 'Desk', 
  'Bed', 'Dresser', 'Coffee Table', 'Nightstand', 'Cabinet', 'Other'
]

const CONDITIONS = [
  'Like New', 'Good', 'Fair', 'Poor'
]

const CATEGORIES = [
  'Living Room', 'Bedroom', 'Kitchen', 'Office', 'Outdoor', 'Storage'
]

const FEATURES = [
  'AI Agent Enabled', 'Free Delivery', 'Negotiable', 'Quick Pickup', 'Recently Listed'
]

export function FilterSidebar({ 
  isOpen, 
  filters, 
  onFiltersChange, 
  className = '' 
}: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    furniture: true,
    condition: true,
    price: true,
    features: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const updateFilters = (updates: Partial<FilterOptions>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  const resetFilters = () => {
    onFiltersChange({
      categories: [],
      furnitureTypes: [],
      conditions: [],
      priceRange: [0, filters.maxPrice],
      maxPrice: filters.maxPrice,
      features: []
    })
  }

  const hasActiveFilters = 
    filters.categories.length > 0 ||
    filters.furnitureTypes.length > 0 ||
    filters.conditions.length > 0 ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < filters.maxPrice ||
    filters.features.length > 0

  if (!isOpen) return null

  return (
    <div className={`w-80 bg-white/70 backdrop-blur-md border-r border-white/20 ${className}`}>
      <ScrollArea className="h-full">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Filters</h2>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Categories */}
            <Collapsible 
              open={expandedSections.categories} 
              onOpenChange={() => toggleSection('categories')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-medium"
                >
                  Categories
                  {expandedSections.categories ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-2">
                  {CATEGORIES.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={category}
                        checked={filters.categories.includes(category)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFilters({
                              categories: [...filters.categories, category]
                            })
                          } else {
                            updateFilters({
                              categories: filters.categories.filter(c => c !== category)
                            })
                          }
                        }}
                      />
                      <label
                        htmlFor={category}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Furniture Types */}
            <Collapsible 
              open={expandedSections.furniture} 
              onOpenChange={() => toggleSection('furniture')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-medium"
                >
                  Furniture Type
                  {expandedSections.furniture ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-2">
                  {FURNITURE_TYPES.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={filters.furnitureTypes.includes(type)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFilters({
                              furnitureTypes: [...filters.furnitureTypes, type]
                            })
                          } else {
                            updateFilters({
                              furnitureTypes: filters.furnitureTypes.filter(t => t !== type)
                            })
                          }
                        }}
                      />
                      <label
                        htmlFor={type}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Condition */}
            <Collapsible 
              open={expandedSections.condition} 
              onOpenChange={() => toggleSection('condition')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-medium"
                >
                  Condition
                  {expandedSections.condition ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS.map((condition) => (
                    <Badge
                      key={condition}
                      variant={filters.conditions.includes(condition) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (filters.conditions.includes(condition)) {
                          updateFilters({
                            conditions: filters.conditions.filter(c => c !== condition)
                          })
                        } else {
                          updateFilters({
                            conditions: [...filters.conditions, condition]
                          })
                        }
                      }}
                    >
                      {condition}
                    </Badge>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Price Range */}
            <Collapsible 
              open={expandedSections.price} 
              onOpenChange={() => toggleSection('price')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-medium"
                >
                  Price Range
                  {expandedSections.price ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-4">
                <div className="px-2">
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                    max={filters.maxPrice}
                    min={0}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-2">
                    <span>${filters.priceRange[0]}</span>
                    <span>${filters.priceRange[1]}</span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Features */}
            <Collapsible 
              open={expandedSections.features} 
              onOpenChange={() => toggleSection('features')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-medium"
                >
                  Features
                  {expandedSections.features ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-2">
                  {FEATURES.map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Checkbox
                        id={feature}
                        checked={filters.features.includes(feature)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFilters({
                              features: [...filters.features, feature]
                            })
                          } else {
                            updateFilters({
                              features: filters.features.filter(f => f !== feature)
                            })
                          }
                        }}
                      />
                      <label
                        htmlFor={feature}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {feature}
                      </label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}