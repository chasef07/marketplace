'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'
import { SimpleChatInterface } from './SimpleChatInterface'
import { StatusIndicator } from './StatusIndicator'

interface SimpleGlassOverlayProps {
  className?: string
}

export function SimpleGlassOverlay({ className = '' }: SimpleGlassOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [notifications, setNotifications] = useState(0)

  console.log('SimpleGlassOverlay rendering, expanded:', isExpanded)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
    if (!isExpanded) {
      setNotifications(0) // Clear notifications when opening
    }
  }

  const handleClose = () => {
    setIsExpanded(false)
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <AnimatePresence>
        {!isExpanded ? (
          // Minimized floating button
          <motion.div
            key="minimized"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative"
          >
            <button
              onClick={toggleExpanded}
              className="w-14 h-14 rounded-full shadow-2xl border border-white/20 overflow-hidden hover:scale-105 transition-transform duration-200"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              }}
              aria-label={`Open chat assistant${notifications > 0 ? ` (${notifications} notifications)` : ''}`}
            >
              <div className="w-full h-full flex items-center justify-center hover:bg-white/10 transition-colors duration-200">
                <MessageCircle 
                  className="w-6 h-6" 
                  style={{ color: '#8B4513' }}
                />
              </div>
            </button>
            
            {/* Notification badge */}
            {notifications > 0 && (
              <div className="absolute -top-1 -right-1">
                <StatusIndicator 
                  notifications={notifications}
                  size="sm"
                />
              </div>
            )}

            {/* Subtle pulsing glow for attention */}
            {notifications > 0 && (
              <motion.div
                className="absolute inset-0 rounded-full -z-10"
                style={{
                  background: 'rgba(139, 69, 19, 0.2)',
                  filter: 'blur(8px)',
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            )}
          </motion.div>
        ) : (
          // Expanded chat panel
          <motion.div
            key="expanded"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-96 h-[32rem] rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
          >
            {/* Header */}
            <div className="h-12 bg-gradient-to-r from-transparent to-white/10 border-b border-white/10 flex items-center justify-between px-4">
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
              </div>

              <button
                onClick={handleClose}
                className="p-1 rounded-full hover:bg-white/20 transition-colors duration-150"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" style={{ color: '#8B4513' }} />
              </button>
            </div>

            {/* Chat interface */}
            <div className="h-[calc(100%-3rem)]">
              <SimpleChatInterface 
                onNotification={() => setNotifications(prev => prev + 1)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop shadow for expanded state */}
      {isExpanded && (
        <div
          className="absolute inset-0 rounded-2xl -z-10"
          style={{
            background: 'rgba(139, 69, 19, 0.1)',
            filter: 'blur(12px)',
            transform: 'translate(0, 8px)'
          }}
        />
      )}
    </div>
  )
}

export default SimpleGlassOverlay