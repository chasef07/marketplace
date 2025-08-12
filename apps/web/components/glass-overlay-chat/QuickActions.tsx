'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  MessageSquare, 
  Eye, 
  DollarSign, 
  Package,
  Users,
  Clock,
  Star
} from 'lucide-react'
import type { QuickActionItem } from './types'

interface QuickActionsProps {
  onActionSelect: (action: string) => void
  isCompact?: boolean
  className?: string
}

export function QuickActions({ onActionSelect, isCompact = false, className = '' }: QuickActionsProps) {
  const quickActions: QuickActionItem[] = [
    {
      id: 'status',
      label: 'Current status',
      action: () => onActionSelect('What is my current marketplace status?'),
      icon: <TrendingUp className="w-3 h-3" />
    },
    {
      id: 'offers',
      label: 'New offers',
      action: () => onActionSelect('Any new offers today?'),
      icon: <DollarSign className="w-3 h-3" />
    },
    {
      id: 'listings',
      label: 'My listings',
      action: () => onActionSelect('show_listings'),
      icon: <Package className="w-3 h-3" />
    },
    {
      id: 'inbox',
      label: 'Inbox',
      action: () => onActionSelect('inbox'),
      icon: <MessageSquare className="w-3 h-3" />
    }
  ]

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
        className={`flex flex-wrap gap-1 ${className}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {quickActions.slice(0, 3).map((action) => (
          <motion.button
            key={action.id}
            variants={itemVariants}
            onClick={action.action}
            className="px-2 py-1 text-xs rounded-lg bg-white/60 hover:bg-white/80 border border-white/30 transition-all duration-200 flex items-center gap-1"
            style={{ color: '#6B5A47' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {action.icon}
            <span className="truncate max-w-[60px]">{action.label.split(' ')[0]}</span>
          </motion.button>
        ))}
      </motion.div>
    )
  }

  return (
    <motion.div 
      className={`space-y-2 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="text-xs font-medium text-gray-600 px-1">
        Quick Actions
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => (
          <motion.button
            key={action.id}
            variants={itemVariants}
            onClick={action.action}
            className="px-3 py-2 text-xs rounded-xl bg-white/60 hover:bg-white/80 border border-white/30 transition-all duration-200 flex items-center gap-2 text-left"
            style={{ color: '#6B5A47' }}
            whileHover={{ 
              scale: 1.02,
              backgroundColor: 'rgba(255, 255, 255, 0.9)'
            }}
            whileTap={{ scale: 0.98 }}
          >
            <div 
              className="p-1 rounded-lg"
              style={{ backgroundColor: 'rgba(139, 69, 19, 0.1)' }}
            >
              {action.icon}
            </div>
            <span className="flex-1 truncate">{action.label}</span>
            {action.badge && action.badge > 0 && (
              <div 
                className="px-1.5 py-0.5 text-xs rounded-full text-white min-w-[18px] text-center"
                style={{ backgroundColor: '#ef4444', fontSize: '10px' }}
              >
                {action.badge}
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Contextual actions based on time of day */}
      <motion.div
        variants={itemVariants}
        className="pt-2 border-t border-white/20"
      >
        <TimeBasedSuggestion onActionSelect={onActionSelect} />
      </motion.div>
    </motion.div>
  )
}

function TimeBasedSuggestion({ onActionSelect }: { onActionSelect: (action: string) => void }) {
  const hour = new Date().getHours()
  let suggestion = ''
  let icon = <Clock className="w-3 h-3" />

  if (hour >= 6 && hour < 12) {
    suggestion = 'Good morning! Check overnight activity'
    icon = <Eye className="w-3 h-3" />
  } else if (hour >= 12 && hour < 17) {
    suggestion = 'Review and respond to offers'
    icon = <MessageSquare className="w-3 h-3" />
  } else if (hour >= 17 && hour < 22) {
    suggestion = 'Evening is prime time - check activity'
    icon = <Users className="w-3 h-3" />
  } else {
    suggestion = 'Quiet time - plan for tomorrow'
    icon = <Star className="w-3 h-3" />
  }

  const getSuggestionQuery = () => {
    if (hour >= 6 && hour < 12) {
      return 'What happened overnight with my listings?'
    } else if (hour >= 12 && hour < 17) {
      return 'Show me offers that need my attention'
    } else if (hour >= 17 && hour < 22) {
      return 'What is my current marketplace activity?'
    } else {
      return 'Help me plan for tomorrow'
    }
  }

  return (
    <motion.button
      onClick={() => onActionSelect(getSuggestionQuery())}
      className="w-full px-3 py-2 text-xs rounded-xl bg-gradient-to-r from-white/40 to-white/60 hover:from-white/60 hover:to-white/80 border border-white/30 transition-all duration-200 flex items-center gap-2 text-left"
      style={{ color: '#8B4513' }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div 
        className="p-1 rounded-lg"
        style={{ backgroundColor: 'rgba(139, 69, 19, 0.2)' }}
      >
        {icon}
      </div>
      <span className="flex-1 font-medium">{suggestion}</span>
    </motion.button>
  )
}

export default QuickActions