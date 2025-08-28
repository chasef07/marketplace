'use client'

import { CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface OfferConfirmationPopupProps {
  isVisible: boolean
  onClose: () => void
  offerDetails?: {
    itemName?: string
    price?: number
    sellerUsername?: string
    isAgentEnabled?: boolean
  }
}

export default function OfferConfirmationPopup({ 
  isVisible, 
  onClose,
  offerDetails
}: OfferConfirmationPopupProps) {
  

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
              className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="h-8 w-8 text-white" />
            </motion.div>
            
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Offer Confirmed
            </h2>
            
            <p className="text-slate-600 text-sm mb-4">
              Your offer has been submitted successfully
            </p>

            
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              onClick={onClose}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Done
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}