'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Wifi, WifiOff } from 'lucide-react'
import { useMarketplaceChat } from './hooks/useMarketplaceChat'
import { MessageBubble } from './MessageBubble'
import { StatusIndicator } from './StatusIndicator'

interface ChatInterfaceProps {
  isExpanded: boolean
  onNotification?: () => void
  className?: string
}

export function ChatInterface({ isExpanded, onNotification, className = '' }: ChatInterfaceProps) {
  const {
    messages,
    isLoading,
    isInitialized,
    error,
    connectionStatus,
    queuedCount,
    sendMessage,
    initializeChat,
    handleButtonClick
  } = useMarketplaceChat()

  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Initialize chat when component mounts
  useEffect(() => {
    if (!isInitialized) {
      initializeChat()
    }
  }, [isInitialized, initializeChat])

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isExpanded])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    const message = inputMessage.trim()
    setInputMessage('')
    
    try {
      await sendMessage(message)
      // Trigger notification if provided
      onNotification?.()
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value)
  }

  if (!isExpanded) {
    // Minimized view - just show message count or status
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <StatusIndicator 
            isOnline={connectionStatus === 'online'}
            isTyping={isLoading}
            size="lg"
          />
          {messages.length > 1 && (
            <div className="text-xs text-gray-600 mt-1">
              {messages.length - 1} messages
            </div>
          )}
          {queuedCount > 0 && (
            <div className="text-xs text-amber-600 mt-1">
              {queuedCount} queued
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col bg-gradient-to-b from-transparent to-white/5 ${className}`}>
      {/* Connection status bar */}
      <AnimatePresence>
        {connectionStatus !== 'online' && (
          <motion.div
            className="px-3 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center gap-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {connectionStatus === 'offline' ? (
              <WifiOff className="w-3 h-3" />
            ) : (
              <Wifi className="w-3 h-3" />
            )}
            <span>
              {connectionStatus === 'offline' 
                ? `Offline${queuedCount > 0 ? ` • ${queuedCount} queued` : ''}`
                : 'Connecting...'
              }
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent focus:outline-none"
        style={{ minHeight: 0 }}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
      >
        <AnimatePresence mode="popLayout">
          {!isInitialized ? (
            <motion.div 
              className="flex justify-center items-center h-24"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-2 text-sm" style={{ color: '#8B4513' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Initializing...</span>
              </div>
            </motion.div>
          ) : messages.length === 0 ? (
            <motion.div 
              className="flex flex-col items-center justify-center h-24 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-sm" style={{ color: '#8B4513' }}>
                AI Assistant Ready
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Ask me about your listings and offers
              </div>
            </motion.div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isCompact={!isExpanded}
                onButtonClick={(action, data) => {
                  console.log('ChatInterface received button click:', action, data)
                  handleButtonClick(action, data)
                }}
              />
            ))
          )}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="flex justify-start"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <div className="flex items-end gap-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #8B4513, #CD853F)' }}
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border rounded-2xl px-4 py-3 shadow-sm">
                  <StatusIndicator isTyping={true} size="sm" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>


      {/* Input area */}
      <div className="border-t border-white/10 p-3 bg-white/5" role="region" aria-label="Chat input">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            placeholder={
              connectionStatus === 'offline' 
                ? "Offline - message will be queued" 
                : "Ask about your offers, listings..."
            }
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm rounded-full border border-white/20 bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-opacity-20 disabled:opacity-50 placeholder-gray-500"
            style={{ 
              '--tw-ring-color': 'rgba(139, 69, 19, 0.3)'
            } as React.CSSProperties}
            aria-label="Type your message"
            aria-describedby={error ? "chat-error" : undefined}
            autoComplete="off"
          />
          
          <motion.button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="px-3 py-2 rounded-full text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[40px]"
            style={{ 
              background: inputMessage.trim() && !isLoading 
                ? 'linear-gradient(135deg, #8B4513, #CD853F)'
                : 'rgba(139, 69, 19, 0.5)'
            }}
            whileHover={inputMessage.trim() && !isLoading ? { scale: 1.05 } : {}}
            whileTap={inputMessage.trim() && !isLoading ? { scale: 0.95 } : {}}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </form>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              id="chat-error"
              className="mt-2 text-xs text-red-600 px-1"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              role="alert"
              aria-live="polite"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}

export default ChatInterface