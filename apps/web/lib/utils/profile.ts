/**
 * Shared Profile Utilities
 * Consolidates duplicate utility functions that were spread across profile components
 */

import { createClient } from '@/lib/supabase'
import { ProfileItem } from '@/lib/types/profile'

// Singleton Supabase client for profile utilities
const supabase = createClient()

/**
 * Get the public URL for a profile picture
 */
export function getProfileImageUrl(filename?: string | null): string | null {
  if (!filename) return null
  const { data } = supabase.storage.from('furniture-images').getPublicUrl(filename)
  return data.publicUrl
}

/**
 * Get the primary image URL for a profile item
 */
export function getItemImageUrl(item: ProfileItem): string | null {
  const primaryImage = item.images?.find(img => img.is_primary) || item.images?.[0]
  const filename = primaryImage?.filename || item.image_filename
  
  if (!filename) return null
  
  const { data } = supabase.storage.from('furniture-images').getPublicUrl(filename)
  return data.publicUrl
}

/**
 * Format price as currency
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Format date as time ago (e.g., "2 hours ago", "3 days ago")
 */
export function formatTimeAgo(timestamp: string): string {
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

/**
 * Format member since date (e.g., "January 2023")
 */
export function formatMemberSince(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  })
}

/**
 * Format last active date with relative time
 */
export function formatLastActive(timestamp?: string | null): string {
  if (!timestamp) return 'Never'
  
  const diffDays = Math.floor((Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Active today'
  if (diffDays === 1) return 'Active yesterday'
  if (diffDays < 7) return `Active ${diffDays} days ago`
  if (diffDays < 30) return `Active ${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `Active ${Math.floor(diffDays / 30)} months ago`
  return `Active ${Math.floor(diffDays / 365)} years ago`
}

/**
 * Get item status badge variant for styling
 */
export function getItemStatusVariant(status?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default'
    case 'under_negotiation':
      return 'secondary'
    case 'sold':
    case 'sold_pending':
      return 'destructive'
    case 'paused':
    case 'archived':
      return 'outline'
    default:
      return 'secondary'
  }
}

/**
 * Format item status for display
 */
export function formatItemStatus(status?: string): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'under_negotiation':
      return 'Under Negotiation'
    case 'sold_pending':
      return 'Sale Pending'
    case 'sold':
      return 'Sold'
    case 'paused':
      return 'Paused'
    case 'archived':
      return 'Archived'
    case 'draft':
      return 'Draft'
    case 'pending_review':
      return 'Pending Review'
    case 'flagged':
      return 'Flagged'
    case 'removed':
      return 'Removed'
    default:
      return 'Unknown'
  }
}

/**
 * Calculate rating display (stars or numeric)
 */
export function formatRating(average: number, count: number): { display: string; stars: number } {
  const stars = Math.round(average * 2) / 2 // Round to nearest 0.5
  const display = count > 0 ? `${average.toFixed(1)} (${count})` : 'No ratings yet'
  
  return { display, stars }
}

/**
 * Get initials from display name for avatar fallback
 */
export function getInitials(displayName: string): string {
  return displayName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

/**
 * Validate profile edit form data
 */
export function validateProfileData(data: {
  display_name: string
  bio?: string
  city?: string
  state?: string
  zip_code?: string
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  
  if (!data.display_name?.trim()) {
    errors.display_name = 'Display name is required'
  } else if (data.display_name.length > 50) {
    errors.display_name = 'Display name must be 50 characters or less'
  }
  
  if (data.bio && data.bio.length > 500) {
    errors.bio = 'Bio must be 500 characters or less'
  }
  
  if (data.zip_code && !/^\d{5}(-\d{4})?$/.test(data.zip_code)) {
    errors.zip_code = 'Please enter a valid ZIP code'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}