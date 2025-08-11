'use client'

import { useState, useCallback } from 'react'

interface SimpleOverlayState {
  isVisible: boolean
  isExpanded: boolean
  notifications: number
}

export function useSimpleOverlay() {
  const [state, setState] = useState<SimpleOverlayState>({
    isVisible: true, // Always visible for authenticated users
    isExpanded: false,
    notifications: 0
  })

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    setState(prev => ({
      ...prev,
      isExpanded: !prev.isExpanded,
      // Clear notifications when expanding
      notifications: prev.isExpanded ? prev.notifications : 0
    }))
  }, [])

  // Show overlay
  const showOverlay = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: true }))
  }, [])

  // Hide overlay
  const hideOverlay = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false, isExpanded: false }))
  }, [])

  // Add notification
  const addNotification = useCallback(() => {
    setState(prev => ({ ...prev, notifications: prev.notifications + 1 }))
  }, [])

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setState(prev => ({ ...prev, notifications: 0 }))
  }, [])

  return {
    ...state,
    toggleExpanded,
    showOverlay,
    hideOverlay,
    addNotification,
    clearNotifications
  }
}