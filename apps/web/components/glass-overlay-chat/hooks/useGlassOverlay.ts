'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Position, GlassOverlayState, OverlayPreferences } from '../types'

const DEFAULT_POSITION: Position = { 
  x: typeof window !== 'undefined' ? window.innerWidth - 80 : 320, 
  y: typeof window !== 'undefined' ? window.innerHeight - 80 : 80 
}
const MINIMIZED_SIZE = { width: 60, height: 60 }
const EXPANDED_SIZE = { width: 400, height: 600 }
const EDGE_SNAP_THRESHOLD = 20
const STORAGE_KEY = 'glass-overlay-preferences'

export function useGlassOverlay() {
  const [state, setState] = useState<GlassOverlayState>(() => ({
    isVisible: false,
    isExpanded: false,
    isDragging: false,
    position: DEFAULT_POSITION,
    autoHide: true,
    notifications: 0
  }))

  const dragStartPos = useRef<Position>({ x: 0, y: 0 })
  const dragOffset = useRef<Position>({ x: 0, y: 0 })
  const animationFrame = useRef<number>()

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const preferences: OverlayPreferences = JSON.parse(saved)
        setState(prev => ({
          ...prev,
          position: preferences.position || DEFAULT_POSITION,
          autoHide: preferences.autoHide !== undefined ? preferences.autoHide : true
        }))
      }
    } catch (error) {
      console.error('Failed to load overlay preferences:', error)
    }
  }, [])

  // Save preferences to localStorage
  const savePreferences = useCallback((newState: Partial<GlassOverlayState>) => {
    try {
      const preferences: OverlayPreferences = {
        position: newState.position || state.position,
        autoHide: newState.autoHide !== undefined ? newState.autoHide : state.autoHide,
        theme: 'auto',
        notifications: true
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.error('Failed to save overlay preferences:', error)
    }
  }, [state.position, state.autoHide])

  // Snap position to screen edges
  const snapToEdges = useCallback((position: Position): Position => {
    const { innerWidth, innerHeight } = window
    const size = state.isExpanded ? EXPANDED_SIZE : MINIMIZED_SIZE
    
    let { x, y } = position

    // Snap to edges
    if (x < EDGE_SNAP_THRESHOLD) x = EDGE_SNAP_THRESHOLD
    if (x > innerWidth - size.width - EDGE_SNAP_THRESHOLD) {
      x = innerWidth - size.width - EDGE_SNAP_THRESHOLD
    }
    if (y < EDGE_SNAP_THRESHOLD) y = EDGE_SNAP_THRESHOLD
    if (y > innerHeight - size.height - EDGE_SNAP_THRESHOLD) {
      y = innerHeight - size.height - EDGE_SNAP_THRESHOLD
    }

    return { x, y }
  }, [state.isExpanded])

  // Update position with bounds checking
  const updatePosition = useCallback((newPosition: Position, save: boolean = true) => {
    const snappedPosition = snapToEdges(newPosition)
    setState(prev => ({ ...prev, position: snappedPosition }))
    if (save) {
      savePreferences({ position: snappedPosition })
    }
  }, [snapToEdges, savePreferences])

  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: !prev.isVisible }))
  }, [])

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    setState(prev => {
      const newExpanded = !prev.isExpanded
      // Ensure position is still valid after size change
      const newPosition = snapToEdges(prev.position)
      return {
        ...prev,
        isExpanded: newExpanded,
        position: newPosition
      }
    })
  }, [snapToEdges])

  // Show overlay
  const showOverlay = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: true }))
  }, [])

  // Hide overlay
  const hideOverlay = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false, isExpanded: false }))
  }, [])

  // Start dragging
  const startDrag = useCallback((clientX: number, clientY: number) => {
    dragStartPos.current = { x: clientX, y: clientY }
    dragOffset.current = {
      x: clientX - state.position.x,
      y: clientY - state.position.y
    }
    setState(prev => ({ ...prev, isDragging: true }))
  }, [state.position])

  // Handle drag movement
  const handleDrag = useCallback((clientX: number, clientY: number) => {
    if (!state.isDragging) return

    const newPosition = {
      x: clientX - dragOffset.current.x,
      y: clientY - dragOffset.current.y
    }

    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current)
    }

    animationFrame.current = requestAnimationFrame(() => {
      updatePosition(newPosition, false)
    })
  }, [state.isDragging, updatePosition])

  // End dragging
  const endDrag = useCallback(() => {
    if (!state.isDragging) return

    setState(prev => ({ ...prev, isDragging: false }))
    
    // Final position snap and save
    const finalPosition = snapToEdges(state.position)
    updatePosition(finalPosition, true)

    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current)
    }
  }, [state.isDragging, state.position, snapToEdges, updatePosition])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Revalidate position on window resize
      const newPosition = snapToEdges(state.position)
      if (newPosition.x !== state.position.x || newPosition.y !== state.position.y) {
        updatePosition(newPosition, true)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [state.position, snapToEdges, updatePosition])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault()
            if (state.isVisible) {
              toggleExpanded()
            } else {
              showOverlay()
            }
            break
          case 'Escape':
            if (state.isVisible) {
              hideOverlay()
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isVisible, toggleExpanded, showOverlay, hideOverlay])

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
    toggleVisibility,
    toggleExpanded,
    showOverlay,
    hideOverlay,
    startDrag,
    handleDrag,
    endDrag,
    updatePosition,
    addNotification,
    clearNotifications,
    dimensions: state.isExpanded ? EXPANDED_SIZE : MINIMIZED_SIZE
  }
}