'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient, type ChatMessage, type ChatResponse } from '@/lib/api-client-new'
import type { ChatUIMessage } from '../types'

export function useMarketplaceChat() {
  const [messages, setMessages] = useState<ChatUIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'connecting'>('online')
  
  // Queue for offline messages
  const messageQueue = useRef<Array<{ message: string, timestamp: string }>>([])
  const initializationPromise = useRef<Promise<void> | null>(null)

  // Convert API message to UI message format
  const convertMessage = useCallback((msg: ChatMessage): ChatUIMessage => ({
    id: msg.id,
    role: msg.role === 'system' ? 'assistant' : msg.role, // Convert system messages to assistant
    content: msg.content,
    timestamp: msg.created_at,
    functionCalls: msg.function_calls,
    functionResults: msg.function_results,
    metadata: msg.metadata || {}
  }), [])

  // Initialize chat with welcome message
  const initializeChat = useCallback(async () => {
    if (isInitialized || initializationPromise.current) {
      return initializationPromise.current
    }

    initializationPromise.current = (async () => {
      try {
        setConnectionStatus('connecting')
        
        // Get fresh marketplace status for dynamic welcome
        const [statusResponse, negotiationsResponse] = await Promise.all([
          fetch('/api/seller/status', {
            headers: await apiClient.getAuthHeaders(),
            cache: 'no-cache'
          }),
          fetch('/api/negotiations/my-negotiations', {
            headers: await apiClient.getAuthHeaders(),
            cache: 'no-cache'
          })
        ])

        // Create intelligent business-focused welcome message
        let welcomeContent = `What's happening with your listings?`

        if (statusResponse.ok && negotiationsResponse.ok) {
          const status = await statusResponse.json()
          const negotiations = await negotiationsResponse.json()
          const activeNegotiations = negotiations.filter((neg: any) => neg.status === 'active')
          
          // Use business intelligence to generate smart intro
          // Note: This would need the generateSmartIntroMessage function imported
          // For now, use enhanced logic inline
          if (activeNegotiations.length > 0) {
            // Find highest offer with business analysis - using helper to get current offers
            let highestOfferNeg = activeNegotiations[0]
            let highestOffer = 0
            
            // Get current offers for all negotiations
            for (const neg of activeNegotiations) {
              try {
                const response = await fetch(`/api/negotiations/${neg.id}/current-offer`)
                if (response.ok) {
                  const data = await response.json()
                  const offer = parseFloat(data.current_offer || 0)
                  if (offer > highestOffer) {
                    highestOffer = offer
                    highestOfferNeg = neg
                  }
                }
              } catch (error) {
                console.warn('Failed to get current offer for negotiation:', neg.id)
              }
            }
            
            const buyerName = highestOfferNeg.buyer?.[0]?.username || 'Someone'
            const itemName = highestOfferNeg.items?.[0]?.name || 'your item'
            const offerAmount = highestOffer || 0
            const startingPrice = parseFloat(highestOfferNeg.items?.[0]?.starting_price || 0)
            const percentage = startingPrice > 0 ? Math.round((offerAmount / startingPrice) * 100) : 0
            
            if (activeNegotiations.length === 1) {
              if (percentage >= 90) {
                welcomeContent = `Strong offer! ${buyerName}: $${offerAmount} (${percentage}% of asking) for ${itemName}. Accept it?`
              } else if (percentage >= 70) {
                welcomeContent = `${buyerName}: $${offerAmount} (${percentage}% of asking) for ${itemName}. Counter at asking price?`
              } else {
                welcomeContent = `Lowball alert! ${buyerName}: $${offerAmount} (${percentage}% of asking) for ${itemName}. Decline?`
              }
            } else {
              // Note: This is a simplified approach - in production you'd want to batch fetch all current offers
              const strongCount = 0 // Simplified for now since we'd need to fetch all current offers
              
              if (strongCount > 0) {
                welcomeContent = `${activeNegotiations.length} offers! ${strongCount} strong. Best: ${buyerName} $${offerAmount} (${percentage}%). Accept?`
              } else {
                welcomeContent = `${activeNegotiations.length} offers! Highest: ${buyerName} $${offerAmount} (${percentage}%) for ${itemName}. Counter?`
              }
            }
          } else if (status.items && status.items.length > 0) {
            const daysSinceListing = status.items.map((item: any) => {
              const days = Math.floor((Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24))
              return { name: item.name, days, price: item.starting_price }
            }).sort((a: any, b: any) => b.days - a.days)[0]
            
            if (daysSinceListing.days >= 7) {
              welcomeContent = `${daysSinceListing.name}: no offers in ${daysSinceListing.days} days. Lower price from $${daysSinceListing.price}?`
            } else {
              welcomeContent = `${status.items.length} listing${status.items.length > 1 ? 's' : ''} active. No offers yet - be patient or adjust pricing.`
            }
          }
        }

        const now = new Date()

        // Set welcome message
        const welcomeMessage: ChatUIMessage = {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: welcomeContent,
          timestamp: now.toISOString(),
          metadata: { welcome: true, dynamic: true }
        }

        setMessages([welcomeMessage])
        setConnectionStatus('online')
        setIsInitialized(true)
        setError(null)
      } catch (error: any) {
        console.error('Failed to initialize chat:', error)
        setConnectionStatus('offline')
        setError('Failed to initialize chat')
        
        // Fallback welcome message
        const now = new Date()
        const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'
        const fallbackMessage: ChatUIMessage = {
          id: `fallback-${Date.now()}`,
          role: 'assistant',
          content: `Good ${timeOfDay}! I'm your AI marketplace assistant. What would you like to know?`,
          timestamp: now.toISOString(),
          metadata: { welcome: true, fallback: true }
        }
        
        setMessages([fallbackMessage])
        setIsInitialized(true)
      }
    })()

    return initializationPromise.current
  }, [isInitialized])

  // Send message
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return

    const userMessage: ChatUIMessage = {
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
      if (connectionStatus === 'offline') {
        // Queue message for later
        messageQueue.current.push({
          message: message.trim(),
          timestamp: new Date().toISOString()
        })
        throw new Error('Currently offline. Message queued.')
      }

      const response: ChatResponse = await apiClient.sendChatMessage(message.trim(), conversationId || undefined)
      
      if (!conversationId) {
        setConversationId(response.conversation_id)
      }

      const assistantMessage: ChatUIMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        functionCalls: response.function_executed ? { name: response.function_executed } : undefined,
        functionResults: response.function_results,
        metadata: {}
      }

      setMessages(prev => [...prev, assistantMessage])
      setConnectionStatus('online')
      
    } catch (error: any) {
      console.error('Failed to send message:', error)
      setConnectionStatus('offline')
      
      const errorMessage: ChatUIMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date().toISOString(),
        metadata: { error: true }
      }
      
      setMessages(prev => [...prev, errorMessage])
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, connectionStatus])

  // Process queued messages when back online
  const processQueue = useCallback(async () => {
    if (connectionStatus !== 'online' || messageQueue.current.length === 0) return

    const queuedMessages = [...messageQueue.current]
    messageQueue.current = []

    for (const queuedMessage of queuedMessages) {
      await sendMessage(queuedMessage.message)
      // Small delay between queued messages
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }, [connectionStatus, sendMessage])

  // Auto-process queue when connection restored
  useEffect(() => {
    if (connectionStatus === 'online') {
      processQueue()
    }
  }, [connectionStatus, processQueue])

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('online')
    const handleOffline = () => setConnectionStatus('offline')

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    messages,
    isLoading,
    isInitialized,
    error,
    connectionStatus,
    queuedCount: messageQueue.current.length,
    sendMessage,
    initializeChat,
    clearMessages: () => {
      setMessages([])
      setConversationId(null)
      setIsInitialized(false)
      initializationPromise.current = null
    }
  }
}