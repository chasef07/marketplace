'use client'

import { useState, useCallback, useEffect } from 'react'
import { apiClient } from '@/lib/api-client-new'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export function useSimpleChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<number | null>(null)

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: "Hi! I'm your marketplace assistant. I can help you check offers, accept deals, decline lowballs, and message buyers. What would you like to know?",
      timestamp: new Date().toISOString(),
      metadata: { welcome: true }
    }
    setMessages([welcomeMessage])
  }, [])

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
      metadata: {}
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      // Get authenticated headers
      const headers = await apiClient.getAuthHeaders(true)
      
      const response = await fetch('/api/chat/simple', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: message.trim(),
          conversation_id: conversationId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()
      
      if (!conversationId && data.conversation_id) {
        setConversationId(data.conversation_id)
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
        metadata: {}
      }

      setMessages(prev => [...prev, assistantMessage])
      
    } catch (error: unknown) {
      console.error('Failed to send message:', error)
      setError((error as Error).message)
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${(error as Error).message}. Please try again.`,
        timestamp: new Date().toISOString(),
        metadata: { error: true }
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  const clearMessages = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages
  }
}