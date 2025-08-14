'use client'

import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, X, Maximize2, Minimize2 } from 'lucide-react'
import { useGlassOverlay } from './hooks/useGlassOverlay'
import { ChatInterface } from './ChatInterface'
import { StatusIndicator } from './StatusIndicator'

interface GlassOverlayProps {
  className?: string
}

export function GlassOverlay({ className = '' }: GlassOverlayProps) {
  const {
    isVisible,
    isExpanded,
    isDragging,
    position,
    notifications,
    dimensions,
    toggleVisibility,
    toggleExpanded,
    startDrag,
    handleDrag,
    endDrag,
    clearNotifications
  } = useGlassOverlay()

  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  // Handle mouse events for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault()
        handleDrag(e.clientX, e.clientY)
      }
    }

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        endDrag()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Keyboard navigation for accessibility
      if (e.target === containerRef.current || containerRef.current?.contains(e.target as Node)) {
        switch (e.key) {
          case 'Escape':
            e.preventDefault()
            toggleVisibility()
            break
          case ' ':
          case 'Enter':
            if (e.target === containerRef.current) {
              e.preventDefault()
              toggleExpanded()
            }
            break
          case 'ArrowUp':
          case 'ArrowDown':
          case 'ArrowLeft':
          case 'ArrowRight':
            // Allow keyboard positioning for accessibility
            if (e.target === containerRef.current) {
              e.preventDefault()
              const step = e.shiftKey ? 10 : 1
              const newPos = { ...position }
              
              switch (e.key) {
                case 'ArrowUp':
                  newPos.y = Math.max(0, newPos.y - step)
                  break
                case 'ArrowDown':
                  newPos.y = Math.min(window.innerHeight - dimensions.height, newPos.y + step)
                  break
                case 'ArrowLeft':
                  newPos.x = Math.max(0, newPos.x - step)
                  break
                case 'ArrowRight':
                  newPos.x = Math.min(window.innerWidth - dimensions.width, newPos.x + step)
                  break
              }
              
              // Use the updatePosition method from the hook
              // This will be handled by the hook's internal logic
            }
            break
        }
      }
    }

    if (isDragging) {
      isDraggingRef.current = true
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    // Always listen for keyboard events
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleDrag, endDrag, toggleVisibility, toggleExpanded, position, dimensions])

  // Handle touch events for mobile
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length === 1) {
        e.preventDefault()
        const touch = e.touches[0]
        handleDrag(touch.clientX, touch.clientY)
      }
    }

    const handleTouchEnd = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        endDrag()
      }
    }

    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, handleDrag, endDrag])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    startDrag(e.clientX, e.clientY)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      startDrag(touch.clientX, touch.clientY)
    }
  }

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isVisible) {
      toggleExpanded()
    } else {
      toggleVisibility()
      clearNotifications()
    }
  }

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleVisibility()
  }

  if (!isVisible) {
    return (
      <motion.div
        className={`fixed z-50 ${className}`}
        style={{
          left: position.x,
          top: position.y,
          width: dimensions.width,
          height: dimensions.height
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        role="button"
        tabIndex={0}
        aria-label={`AI chat assistant${notifications > 0 ? ` - ${notifications} new notifications` : ''}`}
        aria-expanded="false"
        aria-haspopup="dialog"
      >
        <div
          ref={containerRef}
          className="relative w-full h-full cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-full"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          tabIndex={0}
        >
          {/* Glass morphism bubble */}
          <div
            className="w-full h-full rounded-full shadow-xl border border-white/20 overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
          >
            <button
              onClick={handleToggleClick}
              className="w-full h-full flex items-center justify-center hover:bg-white/10 transition-colors duration-200 relative focus:outline-none"
              aria-label={`Open AI chat assistant${notifications > 0 ? ` (${notifications} notifications)` : ''}`}
              tabIndex={-1}
            >
              <MessageCircle 
                className="w-6 h-6" 
                style={{ color: '#8B4513' }}
              />
              
              {/* Status indicator */}
              <StatusIndicator 
                notifications={notifications}
                className="absolute -top-1 -right-1"
              />
            </button>
          </div>

          {/* Subtle pulsing glow for attention */}
          {notifications > 0 && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'rgba(139, 69, 19, 0.2)',
                filter: 'blur(4px)',
                zIndex: -1
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      ref={containerRef}
      className={`fixed z-50 ${className}`}
      style={{
        left: position.x,
        top: position.y,
        width: dimensions.width,
        height: dimensions.height
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      role="dialog"
      aria-label="AI Chat Assistant"
      aria-expanded="true"
      aria-modal="false"
      tabIndex={0}
    >
      <div
        className={`w-full h-full rounded-2xl shadow-2xl border border-white/20 overflow-hidden ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        {/* Header bar for dragging */}
        <div
          className={`h-10 bg-gradient-to-r from-transparent to-white/10 border-b border-white/10 flex items-center justify-between px-3 ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="flex items-center gap-2">
            <MessageCircle 
              className="w-4 h-4" 
              style={{ color: '#8B4513' }}
            />
            <span 
              className="text-sm font-medium"
              style={{ color: '#6B5A47' }}
            >
              AI Assistant
            </span>
            <StatusIndicator notifications={notifications} size="sm" />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleClick}
              className="p-1 rounded hover:bg-white/20 transition-colors duration-150"
              aria-label={isExpanded ? "Minimize" : "Maximize"}
            >
              {isExpanded ? (
                <Minimize2 className="w-3 h-3" style={{ color: '#8B4513' }} />
              ) : (
                <Maximize2 className="w-3 h-3" style={{ color: '#8B4513' }} />
              )}
            </button>
            <button
              onClick={handleCloseClick}
              className="p-1 rounded hover:bg-white/20 transition-colors duration-150"
              aria-label="Close chat"
            >
              <X className="w-3 h-3" style={{ color: '#8B4513' }} />
            </button>
          </div>
        </div>

        {/* Chat interface */}
        <div className="flex-1 h-[calc(100%-2.5rem)]">
          <ChatInterface 
            isExpanded={isExpanded}
            onNotification={() => {
              // Handle notifications from chat
            }}
          />
        </div>
      </div>

      {/* Subtle drop shadow */}
      <div
        className="absolute inset-0 rounded-2xl -z-10"
        style={{
          background: 'rgba(139, 69, 19, 0.1)',
          filter: 'blur(8px)',
          transform: 'translate(0, 4px)'
        }}
      />
    </motion.div>
  )
}

export default GlassOverlay