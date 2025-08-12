'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Bot, User, Sparkles, AlertCircle } from 'lucide-react'
import type { ChatUIMessage } from './types'

interface MessageBubbleProps {
  message: ChatUIMessage
  isCompact?: boolean
  className?: string
  onButtonClick?: (action: string, data?: any) => void
}

export function MessageBubble({ message, isCompact = false, className = '', onButtonClick }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isError = message.metadata?.error
  const isWelcome = message.metadata?.welcome
  const hasFunctionCall = message.functionCalls && message.functionCalls.name

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <motion.div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      <div className={`flex items-end gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <motion.div 
          className={`flex-shrink-0 ${isCompact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full flex items-center justify-center text-sm font-medium shadow-sm ${
            isUser 
              ? 'text-white' 
              : isError 
                ? 'bg-red-100 text-red-600 border border-red-200'
                : 'text-white'
          }`}
          style={isUser 
            ? { background: 'linear-gradient(135deg, #8B4513, #CD853F)' }
            : !isError 
              ? { background: 'linear-gradient(135deg, #8B4513, #CD853F)' }
              : undefined
          }
          whileHover={{ scale: 1.05 }}
        >
          {isUser ? (
            <User className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} />
          ) : isError ? (
            <AlertCircle className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} />
          ) : (
            <Bot className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} />
          )}
        </motion.div>
        
        {/* Message bubble */}
        <div className={`relative ${isUser ? 'mr-1' : 'ml-1'}`}>
          <motion.div 
            className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'} rounded-2xl shadow-sm border ${
              isUser 
                ? 'text-white' 
                : isError
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : isWelcome
                    ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 text-blue-900'
                    : 'bg-white border-gray-200 text-gray-800'
            }`}
            style={isUser 
              ? { 
                  background: 'linear-gradient(135deg, #8B4513, #CD853F)',
                  borderColor: 'rgba(139, 69, 19, 0.3)'
                }
              : !isError && !isWelcome
                ? { borderColor: 'rgba(139, 69, 19, 0.1)' }
                : undefined
            }
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
          >
            <p className={`${isCompact ? 'text-xs' : 'text-sm'} leading-relaxed whitespace-pre-wrap`}>
              {message.content}
            </p>
            
            {/* Function call indicator */}
            {hasFunctionCall && !isCompact && (
              <motion.div 
                className="mt-2 pt-2 border-t border-white/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-1 text-xs opacity-80">
                  <Sparkles className="w-3 h-3" />
                  <span>Executed: {message.functionCalls.name}</span>
                </div>
              </motion.div>
            )}

            {/* Welcome message sparkles */}
            {isWelcome && !isCompact && (
              <motion.div 
                className="absolute -top-1 -right-1"
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <Sparkles className="w-4 h-4 text-blue-400" />
              </motion.div>
            )}
          </motion.div>

          {/* Interactive Buttons */}
          {!isUser && message.metadata?.buttons && message.metadata.buttons.length > 0 && !isCompact && (
            <div className="mt-3 flex gap-2 justify-start">
              {message.metadata.buttons.map((button: any, index: number) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    console.log('Button clicked in MessageBubble:', button.action, button.data)
                    if (onButtonClick) {
                      onButtonClick(button.action, button.data)
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 hover:shadow-md cursor-pointer ${
                    button.text.includes('Accept') || button.text.includes('Yes')
                      ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100'
                      : button.text.includes('Decline') || button.text.includes('Cancel')
                      ? 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100'  
                      : button.text.includes('Counter') || button.text.includes('$')
                      ? 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {button.text}
                </button>
              ))}
            </div>
          )}
          
          {/* Timestamp */}
          {!isCompact && (
            <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
              {formatTime(message.timestamp)}
              {message.metadata?.dynamic && (
                <span className="ml-1 text-blue-500">●</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default MessageBubble