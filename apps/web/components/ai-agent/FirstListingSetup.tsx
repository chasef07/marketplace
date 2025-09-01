'use client'

import { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { type AIAnalysisResult } from "@/lib/api-client-new"

interface AgentPreferences {
  minAcceptablePrice: number | null
  sellingPriority: 'best_price' | 'quick_sale'
  targetSaleDate?: Date | null
}

interface FirstListingSetupProps {
  isOpen: boolean
  onClose: () => void
  analysisData: AIAnalysisResult
  onComplete: (preferences: AgentPreferences) => void
  isLoading?: boolean
}

const STEPS = [
  {
    id: 'intro',
    title: 'Let AI Handle Your Negotiations',
    description: 'Never miss an offer again'
  },
  {
    id: 'preferences',
    title: 'Set Your Preferences',
    description: 'Configure your AI agent'
  },
  {
    id: 'complete',
    title: "You're All Set!",
    description: 'Your AI agent is ready'
  }
]

export function FirstListingSetup({ 
  isOpen, 
  onClose, 
  analysisData, 
  onComplete,
  isLoading = false 
}: FirstListingSetupProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [preferences, setPreferences] = useState<AgentPreferences>({
    minAcceptablePrice: analysisData?.pricing?.quick_sale_price || null,
    sellingPriority: 'best_price',
    targetSaleDate: null
  })
  const [showDatePicker, setShowDatePicker] = useState(false)

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep])

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const handlePriorityChange = useCallback((priority: 'best_price' | 'quick_sale') => {
    setPreferences(prev => ({ ...prev, sellingPriority: priority }))
    setShowDatePicker(priority === 'quick_sale')
  }, [])

  const handleComplete = useCallback(() => {
    onComplete(preferences)
  }, [preferences, onComplete])

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null
    setPreferences(prev => ({ ...prev, targetSaleDate: date }))
  }, [])

  const currentStepData = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100

  // Step 1: Introduction
  const renderIntroStep = () => (
    <div className="space-y-6 text-center py-8">
      <div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Let AI Handle Your Negotiations</h3>
        <p className="text-lg text-slate-600 mb-6">
          Your AI agent responds to buyers instantly, even when you're busy
        </p>
      </div>

      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                Buyer
              </Badge>
              <span>Makes offer: $350</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <div className="flex items-center space-x-2">
              <span className="text-red-600 font-medium">AI responds instantly</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 bg-white p-3 rounded border">
            "Thanks for your offer! I can do $380. This piece is in excellent condition and priced competitively. Let me know if that works!"
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleNext} size="lg" className="px-8">
          Get Started
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  // Step 2: Preferences
  const renderPreferencesStep = () => (
    <div className="space-y-8 py-6">
      {/* Minimum Price */}
      <div className="space-y-4">
        <Label className="text-base font-semibold text-slate-700">
          Minimum Acceptable Price
        </Label>
        <p className="text-sm text-slate-600">
          If applicable, leave blank for any reasonable offer
        </p>
        
        <div className="space-y-3">
          <Input
            type="number"
            placeholder="Leave blank for flexible pricing"
            value={preferences.minAcceptablePrice || ''}
            onChange={(e) => setPreferences(prev => ({ 
              ...prev, 
              minAcceptablePrice: e.target.value ? parseFloat(e.target.value) : null 
            }))}
            className="text-lg"
          />
          {analysisData?.pricing && (
            <div className="text-xs text-slate-500">
              AI suggested range: ${analysisData.pricing.quick_sale_price} - ${analysisData.pricing.premium_price}
            </div>
          )}
        </div>
      </div>

      {/* Selling Priority */}
      <div className="space-y-4">
        <Label className="text-base font-semibold text-slate-700">
          Selling Priority
        </Label>
        
        <div className="grid gap-3">
          <Card 
            className={`cursor-pointer border-2 transition-colors ${
              preferences.sellingPriority === 'best_price' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => handlePriorityChange('best_price')}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  preferences.sellingPriority === 'best_price'
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-slate-300'
                }`}>
                  {preferences.sellingPriority === 'best_price' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-slate-800">Best Price</div>
                  <div className="text-sm text-slate-600">I want the highest possible price, no rush</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer border-2 transition-colors ${
              preferences.sellingPriority === 'quick_sale' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => handlePriorityChange('quick_sale')}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  preferences.sellingPriority === 'quick_sale'
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-slate-300'
                }`}>
                  {preferences.sellingPriority === 'quick_sale' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">Quick Sale</div>
                  <div className="text-sm text-slate-600">I need to sell by a certain date</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Date picker for quick sale */}
        {preferences.sellingPriority === 'quick_sale' && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Target Sale Date
            </Label>
            <Input
              type="date"
              value={preferences.targetSaleDate ? preferences.targetSaleDate.toISOString().split('T')[0] : ''}
              onChange={handleDateChange}
              min={new Date().toISOString().split('T')[0]}
              className="max-w-xs"
            />
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={handlePrevious}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button onClick={handleNext} size="lg" className="px-8">
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  // Step 3: Completion
  const renderCompleteStep = () => (
    <div className="space-y-6 text-center py-8">
      <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-12 h-12 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Your AI agent is now active!</h3>
        <p className="text-lg text-slate-600 mb-6">
          It will handle all negotiations and respond to offers automatically
        </p>
      </div>

      <Card className="bg-orange-50 border-orange-200 text-left">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Minimum Price:</span>
              <span className="text-slate-600">
                {preferences.minAcceptablePrice ? `$${preferences.minAcceptablePrice}` : 'Flexible'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Priority:</span>
              <span className="text-slate-600">
                {preferences.sellingPriority === 'best_price' ? 'Best Price' : 'Quick Sale'}
              </span>
            </div>
            {preferences.sellingPriority === 'quick_sale' && preferences.targetSaleDate && (
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">Target Date:</span>
                <span className="text-slate-600">
                  {preferences.targetSaleDate.toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={handlePrevious} disabled={isLoading}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button 
          onClick={handleComplete} 
          size="lg" 
          className="px-8"
          disabled={isLoading}
        >
          {isLoading ? 'Publishing Listing...' : 'Publish Listing with AI Agent'}
        </Button>
      </div>
    </div>
  )

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">
                {currentStepData.title}
              </DialogTitle>
              <Badge variant="outline" className="text-xs">
                Step {currentStep + 1} of {STEPS.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-slate-600">
                {currentStepData.description}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {currentStep === 0 && renderIntroStep()}
          {currentStep === 1 && renderPreferencesStep()}
          {currentStep === 2 && renderCompleteStep()}
        </div>
      </DialogContent>
    </Dialog>
  )
}