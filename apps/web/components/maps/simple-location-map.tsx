'use client'

import React from 'react'

interface SimpleLocationMapProps {
  zipCode: string
  className?: string
}

export function SimpleLocationMap({ zipCode, className = '' }: SimpleLocationMapProps) {
  console.log('SimpleLocationMap rendering for zipCode:', zipCode) // Debug log
  
  return (
    <div className={`w-full h-32 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          {/* Visual radius indicator */}
          <div className="relative flex items-center justify-center mb-2">
            {/* Outer radius circle */}
            <div 
              className="w-12 h-12 rounded-full border-2 opacity-20"
              style={{ borderColor: '#8B4513' }}
            />
            {/* Middle radius circle */}
            <div 
              className="absolute w-8 h-8 rounded-full border-2 opacity-30 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{ borderColor: '#8B4513' }}
            />
            {/* Inner radius circle */}
            <div 
              className="absolute w-4 h-4 rounded-full border-2 opacity-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{ borderColor: '#8B4513' }}
            />
            {/* Center dot */}
            <div 
              className="absolute w-2 h-2 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: '#8B4513' }}
            />
          </div>
          
          {/* Location text */}
          <p className="text-sm font-medium" style={{ color: '#8B4513' }}>
            {zipCode} area
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ~5 mile pickup radius
          </p>
        </div>
      </div>
    </div>
  )
}