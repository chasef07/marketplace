"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Search, Sparkles, Loader2 } from 'lucide-react'

interface SearchSuggestion {
  text: string
  type: 'suggestion' | 'example'
}

interface AISearchBarProps {
  onSearch: (query: string) => void
  onQueryChange?: (query: string) => void
  placeholder?: string
  suggestions?: string[]
  isLoading?: boolean
  className?: string
}

export function AISearchBar({ 
  onSearch, 
  onQueryChange,
  placeholder = "Try: 'Looking for a modern 3-seat couch under $500'",
  suggestions = [],
  isLoading = false,
  className = ""
}: AISearchBarProps) {
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Default example queries
  const defaultSuggestions = [
    "cheap table",
    "comfortable chair",
    "modern couch under $500"
  ]

  const displaySuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    onQueryChange?.(value)
    setFocusedIndex(-1)
    
    // Show suggestions when user starts typing or focuses
    if (value.length > 0 || document.activeElement === inputRef.current) {
      setShowSuggestions(true)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    onSearch(suggestion)
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => 
          prev < displaySuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        if (focusedIndex >= 0) {
          e.preventDefault()
          handleSuggestionClick(displaySuggestions[focusedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setFocusedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative w-full max-w-4xl mx-auto ${className}`}>
      {/* AI Badge */}
      <div className="flex items-center justify-center mb-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 rounded-full text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          AI-Powered Search
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          {/* Search Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-6 py-4 pl-14 pr-16 text-lg bg-white border-2 border-gray-200 rounded-2xl shadow-lg focus:border-blue-400 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all duration-200 group-hover:border-gray-300"
            disabled={isLoading}
          />
          
          {/* Search Icon */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            {isLoading ? (
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            ) : (
              <Search className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
            )}
          </div>

          {/* Search Button */}
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
          >
            Search
          </button>
        </div>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && (
          <div 
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Try these AI-powered searches
              </h3>
            </div>

            {/* Suggestions List */}
            <div className="py-2">
              {displaySuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors duration-150 ${
                    index === focusedIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700 text-sm leading-relaxed">
                      {suggestion}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer tip */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                💡 Tip: Use natural language like "looking for", "under $X", "in good condition"
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}