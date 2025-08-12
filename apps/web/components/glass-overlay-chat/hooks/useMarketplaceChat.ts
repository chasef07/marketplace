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
  const [chatMode, setChatMode] = useState<'marketplace' | 'direct'>('marketplace')
  const [directChatBuyer, setDirectChatBuyer] = useState<{ name: string, negotiationId: number } | null>(null)
  
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

  // Switch to direct buyer chat mode
  const switchToDirectChat = useCallback(async (buyerName: string, negotiationId: number) => {
    setChatMode('direct')
    setDirectChatBuyer({ name: buyerName, negotiationId })
    
    // Clear current messages and show transition message
    const transitionMessage: ChatUIMessage = {
      id: `transition-${Date.now()}`,
      role: 'assistant',
      content: `🎉 Great! Your offer has been accepted by ${buyerName}.\n\nYou're now in direct chat with ${buyerName}. You can coordinate pickup, exchange contact details, and finalize the sale.\n\nWhat would you like to discuss?`,
      timestamp: new Date().toISOString(),
      metadata: { transition: true, buyer: buyerName }
    }
    
    setMessages([transitionMessage])
    setIsInitialized(true)
    
    // Listen for offer acceptance events
    window.addEventListener('offerAccepted', handleOfferAccepted as EventListener)
    
    return Promise.resolve()
  }, [])

  // Handle offer acceptance event
  const handleOfferAccepted = useCallback((event: CustomEvent) => {
    const { buyerName, negotiationId } = event.detail
    switchToDirectChat(buyerName, negotiationId)
  }, [switchToDirectChat])

  // Handle chat actions (like accepting offers)
  const handleChatAction = useCallback(async (action: string, data?: any) => {
    if (action === 'accept_offer') {
      // This would be triggered from the conversational API
      // The API handles the actual offer acceptance
      return
    }
    // Add more action handlers as needed
  }, [])

  // Initialize chat with welcome message
  const initializeChat = useCallback(async () => {
    if (isInitialized || initializationPromise.current) {
      return initializationPromise.current
    }

    initializationPromise.current = (async () => {
      try {
        setConnectionStatus('connecting')
        
        // Skip marketplace initialization if in direct chat mode
        if (chatMode === 'direct') {
          setConnectionStatus('online')
          setIsInitialized(true)
          return
        }
        
        // Get fresh marketplace status for dynamic welcome with enhanced data
        const statusResponse = await fetch('/api/marketplace/status', {
          headers: await apiClient.getAuthHeaders(),
          cache: 'no-cache'
        })

        // Simple welcome message with basic marketplace info
        let welcomeContent = "Hey there! 👋 I'm your AI marketplace assistant. Ready to help manage your offers and listings!"
        let welcomeButtons: any[] = [
          { text: "💰 Show My Offers", action: "show_offers" },
          { text: "⚡ Quick Actions", action: "quick_actions" }
        ]

        // Optionally check if there are active offers without complex AI processing
        if (statusResponse.ok) {
          try {
            const status = await statusResponse.json()
            const offerCount = status.negotiations?.length || 0
            const recentCount = status.negotiations?.filter((neg: any) => neg.is_recent)?.length || 0
            
            if (offerCount > 0) {
              if (recentCount > 0) {
                welcomeContent = `Hey there! 👋 You have ${offerCount} active offer${offerCount > 1 ? 's' : ''}${recentCount > 0 ? ` (${recentCount} recent!)` : ''}. What would you like to do?`
              } else {
                welcomeContent = `Hey there! 👋 You have ${offerCount} active offer${offerCount > 1 ? 's' : ''} waiting for your response. What would you like to do?`
              }
            }
          } catch (error) {
            console.warn('Failed to get basic status:', error)
            // Keep the default welcome message
          }
        }

        const now = new Date()

        // Set welcome message with interactive buttons
        const welcomeMessage: ChatUIMessage = {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: welcomeContent,
          timestamp: now.toISOString(),
          metadata: { 
            welcome: true, 
            dynamic: true, 
            buttons: welcomeButtons 
          }
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

      let response: any
      
      if (chatMode === 'direct' && directChatBuyer) {
        // Direct buyer messaging
        const headers = await apiClient.getAuthHeaders(true)
        const directResponse = await fetch('/api/marketplace/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            buyer_name: directChatBuyer.name,
            message: message.trim(),
            negotiation_id: directChatBuyer.negotiationId
          })
        })
        
        if (!directResponse.ok) {
          const errorData = await directResponse.json()
          throw new Error(errorData.error || 'Failed to send message')
        }
        
        const directData = await directResponse.json()
        
        const assistantMessage: ChatUIMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Message sent to ${directChatBuyer.name}! They'll receive: "${message.trim()}"\n\nIs there anything else you'd like to discuss about the pickup or sale?`,
          timestamp: new Date().toISOString(),
          metadata: { direct_message: true, buyer: directChatBuyer.name }
        }
        
        setMessages(prev => [...prev, assistantMessage])
        setConnectionStatus('online')
        
      } else {
        // Use conversational chatbot API
        const headers = await apiClient.getAuthHeaders(true)
        const chatResponse = await fetch('/api/chat/conversational', {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: message.trim() })
        })
        
        if (!chatResponse.ok) {
          throw new Error('Failed to get chat response')
        }
        
        const chatData = await chatResponse.json()
        
        // Handle special actions (like accepting offers)
        if (chatData.action) {
          await handleChatAction(chatData.action, chatData)
        }
        
        const assistantMessage: ChatUIMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: chatData.message,
          timestamp: new Date().toISOString(),
          metadata: { 
            buttons: chatData.buttons || [],
            action: chatData.action
          }
        }

        setMessages(prev => [...prev, assistantMessage])
        setConnectionStatus('online')
      }
      
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
  }, [conversationId, connectionStatus, chatMode, directChatBuyer])

  // Handle button clicks from chat messages
  const handleButtonClick = useCallback(async (action: string, data?: any) => {
    console.log('Button clicked:', action, data) // Debug log
    try {
      // Send the button action as a message to the conversational API
      const actionMessage = action + (data ? `_${data}` : '')
      console.log('Sending action message:', actionMessage) // Debug log
      await sendMessage(actionMessage)
    } catch (error) {
      console.error('Error handling button click:', error)
    }
  }, [sendMessage])

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
    chatMode,
    directChatBuyer,
    sendMessage,
    initializeChat,
    switchToDirectChat,
    handleButtonClick,
    clearMessages: () => {
      setMessages([])
      setConversationId(null)
      setIsInitialized(false)
      initializationPromise.current = null
      setChatMode('marketplace')
      setDirectChatBuyer(null)
    }
  }
}