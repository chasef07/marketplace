'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient, type ChatResponse, type ChatMessage } from '@/lib/api-client-new'

interface User {
  id: string
  username: string
  email: string
}

interface FloatingSellerChatProps {
  user: User
}

export function FloatingSellerChat({ user }: FloatingSellerChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [hasLoadedWelcome, setHasLoadedWelcome] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load welcome message when chat opens
  useEffect(() => {
    if (isOpen && !hasLoadedWelcome && messages.length === 0) {
      loadWelcomeMessage()
    }
  }, [isOpen, hasLoadedWelcome, messages.length])

  const loadWelcomeMessage = async () => {
    if (isLoading || hasLoadedWelcome) return
    
    setIsLoading(true)
    setHasLoadedWelcome(true)

    try {
      // Send a "hello" message to get the current offers status
      const response: ChatResponse = await apiClient.sendChatMessage('hello', conversationId || undefined)
      
      if (!conversationId) {
        setConversationId(response.conversation_id)
      }

      // Add welcome message from assistant
      const welcomeMessageObj: ChatMessage = {
        id: Date.now(),
        conversation_id: response.conversation_id,
        role: 'assistant',
        content: response.message,
        metadata: { 
          buttons: (response as any).buttons,
          inputField: (response as any).inputField
        },
        created_at: new Date().toISOString()
      }

      setMessages([welcomeMessageObj])
      
    } catch (error: any) {
      console.error('Failed to load welcome message:', error)
      
      // Fallback welcome message
      const fallbackMessageObj: ChatMessage = {
        id: Date.now(),
        conversation_id: 0,
        role: 'assistant',
        content: `Hello ${user.username}! I'm having trouble loading your current offers. Please try clicking "Show My Offers" below.`,
        metadata: {},
        created_at: new Date().toISOString()
      }
      
      setMessages([fallbackMessageObj])
    } finally {
      setIsLoading(false)
    }
  }


  const handleButtonClick = async (action: string) => {
    if (isLoading) return
    
    setIsLoading(true)

    // Add user message to show what action was clicked
    const userMessageObj: ChatMessage = {
      id: Date.now(),
      conversation_id: conversationId || 0,
      role: 'user',
      content: action,
      metadata: {},
      created_at: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessageObj])

    try {
      console.log('Sending chat message:', action, 'to conversation:', conversationId)
      const response: ChatResponse = await apiClient.sendChatMessage(action, conversationId || undefined)
      console.log('Received response:', response)
      
      if (!conversationId) {
        setConversationId(response.conversation_id)
      }

      // Add assistant response
      const assistantMessageObj: ChatMessage = {
        id: Date.now() + 1,
        conversation_id: response.conversation_id,
        role: 'assistant',
        content: response.message,
        metadata: { 
          buttons: (response as any).buttons,
          inputField: (response as any).inputField
        },
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
        content: "I'm having trouble connecting right now. Please try again.",
        metadata: { error: true },
        created_at: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, errorMessageObj])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputSubmit = async (inputFieldAction: string) => {
    if (isLoading || !inputValue.trim()) return
    
    setIsLoading(true)

    // Add user message showing the input value
    const userMessageObj: ChatMessage = {
      id: Date.now(),
      conversation_id: conversationId || 0,
      role: 'user',
      content: inputValue.trim(),
      metadata: {},
      created_at: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessageObj])

    try {
      console.log('Sending input value:', inputValue.trim(), 'to conversation:', conversationId)
      const response: ChatResponse = await apiClient.sendChatMessage(inputValue.trim(), conversationId || undefined)
      console.log('Received response:', response)
      
      if (!conversationId) {
        setConversationId(response.conversation_id)
      }

      // Add assistant response
      const assistantMessageObj: ChatMessage = {
        id: Date.now() + 1,
        conversation_id: response.conversation_id,
        role: 'assistant',
        content: response.message,
        metadata: { 
          buttons: (response as any).buttons,
          inputField: (response as any).inputField
        },
        created_at: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessageObj])
      
      // Clear input after successful submission
      setInputValue('')
      
    } catch (error: any) {
      console.error('Failed to send input:', error)
      
      // Add error message
      const errorMessageObj: ChatMessage = {
        id: Date.now() + 2,
        conversation_id: conversationId || 0,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again.",
        metadata: { error: true },
        created_at: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, errorMessageObj])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Floating Chat Icon */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => {
            if (isOpen) {
              // Reset welcome flag when closing so it refreshes on reopen
              setHasLoadedWelcome(false)
              setMessages([])
              setInputValue('')
            }
            setIsOpen(!isOpen)
          }}
          className="w-14 h-14 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 backdrop-blur-2xl relative overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
          }}
        >
          {/* Glass highlight effect */}
          <div 
            className="absolute inset-0 rounded-full opacity-30 group-hover:opacity-50 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 70%)'
            }}
          />
          <MessageCircle className="h-6 w-6 relative z-10" style={{ color: '#374151' }} />
        </Button>
      </div>

      {/* Chat Overlay */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] animate-in slide-in-from-bottom-4 duration-300">
          <Card 
            className="h-full flex flex-col shadow-2xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.05) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              WebkitBackdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
            }}
          >
            {/* Glass reflection effect */}
            <div 
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 50%, transparent 100%)'
              }}
            />
            <div 
              className="absolute top-0 left-0 w-px h-full"
              style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, transparent 100%)'
              }}
            />
            {/* Header */}
            <CardHeader className="pb-3 relative z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-semibold" style={{ color: '#1F1F1F' }}>
                  <Bot className="w-5 h-5" style={{ color: '#374151' }} />
                  AI Assistant
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setHasLoadedWelcome(false)
                    setMessages([])
                    setInputValue('')
                    setIsOpen(false)
                  }}
                  className="h-8 w-8 p-0 rounded-full hover:bg-white/20 transition-all duration-200"
                  style={{ color: '#374151' }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {/* Messages Area */}
            <CardContent className="flex-1 flex flex-col p-4 pt-0 min-h-0">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {isLoading && messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 mb-2" style={{ borderColor: '#8B4513' }}></div>
                    <p className="text-sm" style={{ color: '#374151' }}>
                      Loading your offers...
                    </p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <Bot className="w-8 h-8 mb-2" style={{ color: '#374151' }} />
                    <p className="text-sm" style={{ color: '#374151' }}>
                      Hi {user.username}! Getting your current offers...
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-xl text-sm relative overflow-hidden ${
                          message.role === 'user'
                            ? 'text-white shadow-lg'
                            : 'text-gray-800 shadow-md'
                        }`}
                        style={
                          message.role === 'user'
                            ? { 
                                background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.9), rgba(205, 133, 63, 0.9))',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                              }
                            : { 
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.2) 100%)',
                                backdropFilter: 'blur(15px) saturate(150%)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                              }
                        }
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        
                        {/* Buttons */}
                        {message.role === 'assistant' && message.metadata?.buttons && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {message.metadata.buttons.map((button: any, index: number) => (
                              <button
                                key={index}
                                onClick={() => handleButtonClick(button.action || button.text)}
                                className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 hover:scale-105 hover:shadow-md relative overflow-hidden"
                                style={{ 
                                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)',
                                  backdropFilter: 'blur(10px) saturate(150%)',
                                  border: '1px solid rgba(255, 255, 255, 0.4)',
                                  color: '#374151',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                                }}
                              >
                                {button.text}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Input Field */}
                        {message.role === 'assistant' && message.metadata?.inputField && (
                          <div className="mt-3 space-y-2">
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                {message.metadata.inputField.prefix && (
                                  <span 
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium"
                                    style={{ color: '#374151' }}
                                  >
                                    {message.metadata.inputField.prefix}
                                  </span>
                                )}
                                <input
                                  type={message.metadata.inputField.type}
                                  value={inputValue}
                                  onChange={(e) => setInputValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isLoading && inputValue.trim()) {
                                      handleInputSubmit(message.metadata.inputField.submitAction)
                                    }
                                  }}
                                  placeholder={message.metadata.inputField.placeholder}
                                  disabled={isLoading}
                                  className={`w-full px-3 py-2 text-sm rounded-lg border-0 outline-none transition-all duration-200 ${
                                    message.metadata.inputField.prefix ? 'pl-8' : 'pl-3'
                                  }`}
                                  style={{
                                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.2) 100%)',
                                    backdropFilter: 'blur(15px) saturate(150%)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    color: '#374151',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                                  }}
                                />
                              </div>
                              <button
                                onClick={() => handleInputSubmit(message.metadata.inputField.submitAction)}
                                disabled={isLoading || !inputValue.trim()}
                                className="px-4 py-2 text-xs rounded-lg font-medium transition-all duration-200 hover:scale-105 hover:shadow-md relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ 
                                  background: isLoading || !inputValue.trim() 
                                    ? 'linear-gradient(135deg, rgba(156, 163, 175, 0.3) 0%, rgba(156, 163, 175, 0.1) 100%)'
                                    : 'linear-gradient(135deg, rgba(139, 69, 19, 0.9), rgba(205, 133, 63, 0.9))',
                                  backdropFilter: 'blur(10px) saturate(150%)',
                                  border: '1px solid rgba(255, 255, 255, 0.4)',
                                  color: isLoading || !inputValue.trim() ? '#9CA3AF' : '#FFFFFF',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                                }}
                              >
                                {isLoading ? 'Sending...' : message.metadata.inputField.submitText}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}