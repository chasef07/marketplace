'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Send, Bot, User, Sparkles, ArrowLeft } from "lucide-react"
import { apiClient, type ChatMessage, type ChatResponse, type ChatHistoryResponse } from "@/lib/api-client-new"

interface User {
  id: string
  username: string
  email: string
  seller_personality: string
  buyer_personality: string
  is_active: boolean
  created_at: string
  last_login?: string
}

interface SellerChatProps {
  user: User
  onBack: () => void
}

export function SellerChat({ user, onBack }: SellerChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [lastMessageId, setLastMessageId] = useState<number | null>(null)
  const [hasInitializedWelcome, setHasInitializedWelcome] = useState(false)

  useEffect(() => {
    // Reset state for fresh start each time component mounts
    setHasInitializedWelcome(false)
    setMessages([])
    setConversationId(null)
    loadChatHistory()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Real-time polling disabled for now to prevent UI issues
  // useEffect(() => {
  //   if (!conversationId || isLoading || isInitializing) return

  //   const pollForMessages = setInterval(async () => {
  //     try {
  //       const history = await apiClient.getChatHistory(conversationId)
  //       const newMessages = history.messages
        
  //       // Only update if we have more messages and they're different
  //       if (newMessages.length > messages.length) {
  //         const lastKnownMessage = messages[messages.length - 1]
  //         const lastNewMessage = newMessages[newMessages.length - 1]
          
  //         // Check if the last message is actually different
  //         if (!lastKnownMessage || lastNewMessage.id !== lastKnownMessage.id) {
  //           setMessages(newMessages)
  //         }
  //       }
  //     } catch (error) {
  //       console.error('Failed to poll for messages:', error)
  //     }
  //   }, 5000) // Poll every 5 seconds (less frequent)

  //   return () => clearInterval(pollForMessages)
  // }, [conversationId, messages.length, isLoading, isInitializing])

  const loadChatHistory = async () => {
    try {
      setIsInitializing(true)
      // Don't load old history - start fresh each time like ChatGPT
      setMessages([])
      setConversationId(null)
      
      // Always send welcome message with current status
      if (!hasInitializedWelcome) {
        setHasInitializedWelcome(true)
        await sendWelcomeMessage()
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error)
      // Still send welcome message on error
      if (!hasInitializedWelcome) {
        setHasInitializedWelcome(true)
        await sendWelcomeMessage()
      }
    } finally {
      setIsInitializing(false)
    }
  }

  const sendWelcomeMessage = async () => {
    try {
      // Get current time for greeting
      const now = new Date()
      const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'
      
      // Get fresh status data for welcome message without saving to database yet
      const statusResponse = await fetch('/api/seller/status', {
        headers: await apiClient.getAuthHeaders()
      })
      
      let welcomeContent = `Good ${timeOfDay}! I'm your AI assistant, ready to help you manage your furniture listings.`
      
      if (statusResponse.ok) {
        const status = await statusResponse.json()
        if (status.items && status.items.length > 0) {
          welcomeContent = `Good ${timeOfDay}! ${status.items.length} active listing${status.items.length > 1 ? 's' : ''}, ${status.recent_offers?.length || 0} recent offer${status.recent_offers?.length !== 1 ? 's' : ''}.
          
${status.items.slice(0, 2).map((item: any) => 
  `📦 "${item.name}" - $${item.starting_price} (${item.negotiations?.length || 0} offers)`
).join('\n')}

What would you like to know?`
        }
      }
      
      // Show welcome message (session-only, not saved to DB)
      setMessages([
        {
          id: Date.now(),
          conversation_id: 0, // No conversation ID yet
          role: 'assistant',
          content: welcomeContent,
          metadata: { welcome: true, sessionOnly: true },
          created_at: new Date().toISOString()
        }
      ])
    } catch (error) {
      console.error('Failed to get status for welcome message:', error)
      
      // Fallback welcome message
      const now = new Date()
      const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'
      
      setMessages([
        {
          id: Date.now(),
          conversation_id: 0,
          role: 'assistant',
          content: `Good ${timeOfDay}! I'm your AI assistant, ready to help you manage your furniture listings. What would you like to know?`,
          metadata: { welcome: true, fallback: true, sessionOnly: true },
          created_at: new Date().toISOString()
        }
      ])
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)

    // Add user message immediately
    const userMessageObj: ChatMessage = {
      id: Date.now(),
      conversation_id: conversationId || 0,
      role: 'user',
      content: userMessage,
      metadata: {},
      created_at: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessageObj])

    try {
      const response: ChatResponse = await apiClient.sendChatMessage(userMessage, conversationId || undefined)
      
      if (!conversationId) {
        setConversationId(response.conversation_id)
      }

      // Add assistant response
      const assistantMessageObj: ChatMessage = {
        id: Date.now() + 1,
        conversation_id: response.conversation_id,
        role: 'assistant',
        content: response.message,
        function_calls: response.function_executed ? { name: response.function_executed } : undefined,
        function_results: response.function_results,
        metadata: {},
        created_at: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessageObj])
      
    } catch (error: any) {
      console.error('Failed to send message:', error)
      
      // Add error message
      const errorMessageObj: ChatMessage = {
        id: Date.now() + 2,
        conversation_id: conversationId || 0,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        metadata: { error: true },
        created_at: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, errorMessageObj])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isUser = message.role === 'user'
    const isError = message.metadata.error
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex items-start gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div 
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              isUser 
                ? 'text-white' 
                : isError 
                  ? 'bg-red-100 text-red-600'
                  : 'text-white'
            }`}
            style={isUser 
              ? { background: 'linear-gradient(135deg, #8B4513, #CD853F)' }
              : !isError 
                ? { background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }
                : undefined
            }
          >
            {isUser ? (
              <User className="w-4 h-4" />
            ) : isError ? (
              '!'
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </div>
          
          {/* Message bubble */}
          <div className={`relative ${isUser ? 'mr-2' : 'ml-2'}`}>
            <div 
              className={`px-4 py-3 rounded-2xl ${
                isUser 
                  ? 'text-white' 
                  : isError
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-white border shadow-sm'
              }`}
              style={isUser 
                ? { background: 'linear-gradient(135deg, #8B4513, #CD853F)' }
                : !isError 
                  ? { borderColor: 'rgba(139, 69, 19, 0.1)' }
                  : undefined
              }
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
              
              {/* Function call indicator */}
              {message.function_calls && (
                <div className="mt-2 pt-2 border-t border-white/20">
                  <div className="flex items-center gap-1 text-xs opacity-80">
                    <Sparkles className="w-3 h-3" />
                    <span>Executed: {message.function_calls.name}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Timestamp */}
            <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
              {formatTime(message.created_at)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F7F3E9 0%, #E8DDD4 50%, #DDD1C7 100%)' }}>
      {/* Header */}
      <header className="backdrop-blur-md border-b sticky top-0 z-50" style={{ background: 'rgba(247, 243, 233, 0.9)', borderColor: 'rgba(139, 69, 19, 0.1)' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack}
                className="hover:bg-opacity-10"
                style={{ color: '#8B4513' }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#3C2415' }}>Seller Assistant</h1>
                <p className="text-sm" style={{ color: '#6B5A47' }}>AI-powered help for managing your listings</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm" style={{ color: '#6B5A47' }}>
                Welcome, {user.username}!
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="h-[calc(100vh-200px)] flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2" style={{ color: '#3C2415' }}>
              <Bot className="w-5 h-5" style={{ color: '#2563eb' }} />
              Chat with your AI assistant
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isInitializing ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#8B4513' }}></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Bot className="w-12 h-12 mb-4" style={{ color: '#8B4513' }} />
                  <p style={{ color: '#6B5A47' }}>Your AI assistant is ready to help manage your listings!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              )}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                      style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}
                    >
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Area */}
            <div className="border-t p-4" style={{ borderColor: 'rgba(139, 69, 19, 0.1)' }}>
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about your offers, listings, or say something like 'Any good offers today?'"
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  style={{ 
                    borderColor: 'rgba(139, 69, 19, 0.2)',
                    backgroundColor: '#FAFAFA'
                  }}
                />
                <Button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-6 py-3 rounded-full hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #8B4513, #CD853F)', color: '#F7F3E9' }}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  "Any new offers today?",
                  "Show me my active listings",
                  "What should I do about lowball offers?",
                  "Help me price my items better"
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputMessage(suggestion)}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs rounded-full bg-white border hover:shadow-sm transition-shadow disabled:opacity-50"
                    style={{ 
                      borderColor: 'rgba(139, 69, 19, 0.2)',
                      color: '#6B5A47'
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}