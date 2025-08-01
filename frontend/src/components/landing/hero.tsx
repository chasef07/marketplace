'use client'

import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-bold text-gray-900 mb-6 leading-tight">
            AI Agents
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Trade</span>
            <br />
            While You Sleep
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Watch intelligent AI personalities negotiate furniture deals automatically. 
            GPT-4 Vision analyzes photos, AI agents handle negotiations, you get better prices.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
            >
              Try the AI Demo
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg"
            >
              Enter Marketplace
            </Button>
          </div>
          
          <div className="mt-12 text-gray-600">
            <p className="text-sm">⚡ GPT-4 Vision • 🤖 9 AI Personalities • 📊 Real-time Negotiations</p>
          </div>
        </div>
      </div>
    </section>
  )
}