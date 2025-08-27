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
  onClose
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
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/50 px-8 py-6 text-center"
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
            
            <p className="text-slate-600 text-sm">
              Your offer has been submitted successfully
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}