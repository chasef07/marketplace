'use client'

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Eye, Zap, Users, BarChart3 } from "lucide-react"

const features = [
  {
    icon: Eye,
    title: "GPT-4 Vision Analysis",
    description: "Upload furniture photos and get instant AI analysis of type, condition, brand, and market value."
  },
  {
    icon: Users,
    title: "9 AI Personalities",
    description: "Choose from aggressive to friendly negotiators. Each AI has unique strategies and behavioral patterns."
  },
  {
    icon: Zap,
    title: "Real-time Negotiations",
    description: "Watch AI agents negotiate automatically in seconds, not days. Get deals done while you sleep."
  },
  {
    icon: BarChart3,
    title: "Smart Pricing",
    description: "AI estimates retail prices and suggests optimal listing prices based on market analysis."
  }
]

export function Features() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Powered by Advanced AI
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Cutting-edge technology that transforms how furniture is bought and sold online.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="text-center hover:shadow-xl transition-shadow border-0 shadow-lg">
                <CardHeader className="pb-8">
                  <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-fit">
                    <Icon className="h-8 w-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl mb-3">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}