'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageCircle, Send, Bot, User } from 'lucide-react'
import { useSimpleChat } from './useSimpleChat'

interface ChatDialogProps {
  trigger?: React.ReactNode
}

export function ChatDialog({ trigger }: ChatDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { messages, isLoading, sendMessage, error } = useSimpleChat()

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return
    
    const message = inputValue.trim()
    setInputValue('')
    await sendMessage(message)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            size="sm" 
            className="fixed bottom-4 right-4 rounded-full w-12 h-12 shadow-lg"
            style={{ backgroundColor: '#8B4513' }}
          >
            <MessageCircle className="w-5 h-5 text-white" />
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" style={{ color: '#8B4513' }} />
            AI Marketplace Assistant
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-[300px] max-h-[400px]">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Ask me about your offers and listings!</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4" style={{ color: '#8B4513' }} />
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.metadata?.error && (
                  <p className="text-xs mt-1 opacity-75">Error occurred</p>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 animate-pulse" style={{ color: '#8B4513' }} />
              </div>
              <div className="bg-gray-100 rounded-lg px-3 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your offers..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!inputValue.trim() || isLoading}
            size="sm"
            style={{ backgroundColor: '#8B4513' }}
          >
            <Send className="w-4 h-4 text-white" />
          </Button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputValue("What's my status?")}
            disabled={isLoading}
            className="text-xs"
          >
            Check Status
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputValue("Accept highest offer")}
            disabled={isLoading}
            className="text-xs"
          >
            Accept Best Offer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputValue("Decline lowballs")}
            disabled={isLoading}
            className="text-xs"
          >
            Decline Lowballs
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ChatDialog