'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { SELLER_PERSONALITIES, BUYER_PERSONALITIES } from "@/lib/constants"

export function AIShowcase() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Meet Your AI Negotiators
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose from 9 distinct AI personalities, each with unique negotiation strategies 
            and behavioral patterns. Watch them work together to get you the best deals.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Seller Personalities */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              🏪 Seller Agents
            </h3>
            <div className="grid gap-4">
              {SELLER_PERSONALITIES.map((personality) => (
                <Card key={personality.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="text-2xl">{personality.emoji}</span>
                      {personality.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600">
                      {personality.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Buyer Personalities */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              🛍️ Buyer Agents
            </h3>
            <div className="grid gap-4">
              {BUYER_PERSONALITIES.map((personality) => (
                <Card key={personality.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="text-2xl">{personality.emoji}</span>
                      {personality.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600">
                      {personality.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}