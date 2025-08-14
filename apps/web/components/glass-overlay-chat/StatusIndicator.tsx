'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface StatusIndicatorProps {
  notifications?: number
  isOnline?: boolean
  isTyping?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StatusIndicator({ 
  notifications = 0, 
  isOnline = true,
  isTyping = false,
  size = 'md',
  className = ''
}: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 text-[10px]',
    md: 'w-5 h-5 text-xs',
    lg: 'w-6 h-6 text-sm'
  }

  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  }

  if (notifications > 0) {
    return (
      <motion.div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-medium shadow-lg ${className}`}
        style={{
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white'
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {notifications > 99 ? '99+' : notifications}
      </motion.div>
    )
  }

  if (isTyping) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`${dotSizes[size]} rounded-full`}
              style={{ backgroundColor: '#8B4513' }}
              animate={{
                y: [0, -4, 0],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div 
        className={`${dotSizes[size]} rounded-full border-2 border-red-500 ${className}`}
        style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
        title="Offline"
      />
    )
  }

  // Online indicator
  return (
    <motion.div
      className={`${dotSizes[size]} rounded-full ${className}`}
      style={{ backgroundColor: '#10b981' }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      title="Online"
    >
      {/* Pulsing animation for online status */}
      <motion.div
        className="w-full h-full rounded-full"
        style={{ backgroundColor: '#10b981' }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.6, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    </motion.div>
  )
}

export default StatusIndicator