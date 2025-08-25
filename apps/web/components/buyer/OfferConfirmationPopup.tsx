'use client'

import { CheckCircle, Clock, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

interface OfferConfirmationPopupProps {
  isVisible: boolean
  onClose: () => void
  offerDetails?: {
    itemName: string
    price: number
    sellerUsername?: string
    isAgentEnabled?: boolean
  }
}

export default function OfferConfirmationPopup({ 
  isVisible, 
  onClose, 
  offerDetails
}: OfferConfirmationPopupProps) {

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Popup */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Success Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <CheckCircle className="h-10 w-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Offer Confirmed!</h2>
                <p className="text-green-100">Your offer has been submitted successfully</p>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                {offerDetails && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Item:</span>
                      <span className="font-semibold text-gray-900 text-right max-w-48 truncate">
                        {offerDetails.itemName}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Your Offer:</span>
                      <span className="font-bold text-green-600 text-xl">
                        {formatPrice(offerDetails.price)}
                      </span>
                    </div>

                    {offerDetails.sellerUsername && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Seller:</span>
                        <span className="font-medium text-gray-900">
                          @{offerDetails.sellerUsername}
                        </span>
                      </div>
                    )}

                    {offerDetails.isAgentEnabled && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center text-blue-700">
                          <Bot className="h-5 w-5 mr-2" />
                          <span className="font-medium">AI Agent Enabled</span>
                        </div>
                        <p className="text-blue-600 text-sm mt-1">
                          This seller uses an AI agent for negotiations. You may receive a response soon!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-600 mb-2">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="text-sm">What happens next?</span>
                  </div>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• The seller will review your offer</li>
                    <li>• You&apos;ll be notified of their response</li>
                    <li>• Check your profile for updates</li>
                  </ul>
                </div>

                {/* Manual close button */}
                <div className="flex justify-end">
                  <Button
                    onClick={onClose}
                    variant="outline"
                    size="sm"
                    className="min-w-20"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}