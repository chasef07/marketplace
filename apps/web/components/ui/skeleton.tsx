import React from "react"
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      {...props}
    />
  )
}

export function ItemSkeleton() {
  return (
    <div className="bg-white rounded-lg border shadow-sm animate-pulse">
      {/* Image skeleton */}
      <div className="h-48 bg-gray-200 rounded-t-lg" />
      
      <div className="p-4">
        {/* Price and heart skeleton */}
        <div className="flex justify-between items-start mb-2">
          <div className="h-8 bg-gray-200 rounded w-20" />
          <div className="w-6 h-6 bg-gray-200 rounded-full" />
        </div>
        
        {/* Title skeleton */}
        <div className="h-6 bg-gray-200 rounded mb-2 w-3/4" />
        
        {/* Description skeleton */}
        <div className="space-y-1 mb-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
        
        {/* Meta info skeleton */}
        <div className="flex items-center justify-between text-sm">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-12" />
        </div>
      </div>
    </div>
  )
}

export { Skeleton }

export function ItemDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Image skeleton */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-0 h-96 animate-pulse">
              <div className="bg-gray-200 h-full rounded-lg" />
            </div>
          </div>
          
          {/* Details skeleton */}
          <div className="space-y-6">
            {/* Price and actions skeleton */}
            <div className="bg-white rounded-lg p-6 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="h-12 bg-gray-200 rounded w-32" />
                <div className="w-10 h-10 bg-gray-200 rounded" />
              </div>
              
              <div className="h-6 bg-gray-200 rounded w-24 mb-4" />
              
              <div className="space-y-3">
                <div className="h-12 bg-gray-200 rounded w-full" />
                <div className="h-12 bg-gray-200 rounded w-full" />
              </div>
            </div>
            
            {/* Description skeleton */}
            <div className="bg-white rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-3" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
            
            {/* Details skeleton */}
            <div className="bg-white rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-20 mb-3" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            </div>
            
            {/* Seller info skeleton */}
            <div className="bg-white rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-40 mb-3" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div>
                  <div className="h-5 bg-gray-200 rounded w-24 mb-1" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              </div>
              <div className="h-32 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}