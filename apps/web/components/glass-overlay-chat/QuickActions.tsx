'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign
} from 'lucide-react'
// import type { QuickActionItem } from './types'

interface QuickActionsProps {
  onActionSelect: (action: string) => void
  isCompact?: boolean
  className?: string
}

export function QuickActions({ onActionSelect, isCompact = false, className = '' }: QuickActionsProps) {
  // Simplified to focus on the main action - Show My Offers
  const primaryAction = {
    id: 'offers',
    label: 'Show My Offers',
    action: () => onActionSelect('Show my offers'),
    icon: <DollarSign className="w-4 h-4" />
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  }

  if (isCompact) {
    return (
      <motion.div 
        className={`flex justify-center ${className}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.button
          variants={itemVariants}
          onClick={primaryAction.action}
          className="px-4 py-2 text-sm rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
          style={{ 
            background: 'linear-gradient(135deg, #8B4513, #CD853F)',
            boxShadow: '0 4px 16px rgba(139, 69, 19, 0.3)'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          💰
          <span>Show My Offers</span>
        </motion.button>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className={`space-y-3 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="text-center">
        <div className="text-xs font-medium text-gray-600 mb-2">
          👆 Start here to manage your offers
        </div>
        
        <motion.button
          variants={itemVariants}
          onClick={primaryAction.action}
          className="w-full px-6 py-4 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 relative"
          style={{ 
            background: 'linear-gradient(135deg, #8B4513, #CD853F)',
            boxShadow: '0 8px 32px rgba(139, 69, 19, 0.3)'
          }}
          whileHover={{ 
            scale: 1.02,
            boxShadow: '0 12px 40px rgba(139, 69, 19, 0.4)'
          }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-2xl">💰</span>
          <div className="text-left">
            <div className="text-lg">Show My Offers</div>
            <div className="text-sm opacity-90">View all active negotiations</div>
          </div>
          {/* Pulsing indicator */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
        </motion.button>
      </div>
    </motion.div>
  )
}

// TimeBasedSuggestion removed for simplified interface

export default QuickActions