'use client'

import { CheckCircle, Zap, DollarSign, MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

interface OfferConfirmationPopupProps {
  isVisible: boolean
  onClose: () => void
  offerDetails?: {
    itemName?: string
    price?: number
    sellerUsername?: string
    isAgentEnabled?: boolean
    agentResponse?: {
      success: boolean
      decision: string
      reasoning: string
      actionResult: {
        success: boolean
        action: string
        price?: number
        error?: string
      }
      executionTimeMs: number
    } | null
  }
}

export default function OfferConfirmationPopup({ 
  isVisible, 
  onClose,
  offerDetails
}: OfferConfirmationPopupProps) {
  
  const agentResponse = offerDetails?.agentResponse
  const hasAgentResponse = agentResponse?.success && agentResponse.actionResult.success

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/50 px-8 py-6 text-center max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", bounce: 0.4 }}
              className={`w-14 h-14 ${hasAgentResponse ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-blue-500'} rounded-full flex items-center justify-center mx-auto mb-4`}
            >
              {hasAgentResponse ? (
                <Zap className="h-8 w-8 text-white" />
              ) : (
                <CheckCircle className="h-8 w-8 text-white" />
              )}
            </motion.div>
            
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              {hasAgentResponse ? 'Instant Response!' : 'Offer Confirmed'}
            </h2>
            
            <p className="text-slate-600 text-sm mb-4">
              {hasAgentResponse 
                ? 'The seller\'s AI agent responded immediately'
                : 'Your offer has been submitted successfully'
              }
            </p>

            {/* Agent Response Details */}
            {hasAgentResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-50 rounded-lg p-4 mb-4 text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    variant={agentResponse.actionResult.action === 'COUNTERED' ? 'default' : 
                           agentResponse.actionResult.action === 'ACCEPTED' ? 'secondary' : 
                           'outline'}
                    className="text-xs"
                  >
                    {agentResponse.decision === 'counter' && agentResponse.actionResult.price ? (
                      <>Counter: ${agentResponse.actionResult.price}</>
                    ) : (
                      agentResponse.actionResult.action
                    )}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {agentResponse.executionTimeMs}ms
                  </span>
                </div>
                
                {agentResponse.decision === 'counter' && agentResponse.actionResult.price && (
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-slate-700">
                      Counter offer: ${agentResponse.actionResult.price}
                    </span>
                  </div>
                )}
                
                <div className="flex items-start gap-2 text-sm">
                  <MessageCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {agentResponse.reasoning.split('\n')[0].substring(0, 150)}
                    {agentResponse.reasoning.length > 150 ? '...' : ''}
                  </p>
                </div>
              </motion.div>
            )}
            
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              onClick={onClose}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              {hasAgentResponse ? 'Continue Negotiation' : 'Done'}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}