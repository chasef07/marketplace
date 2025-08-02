'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, RefreshCw, Eye } from "lucide-react"
import { useState } from "react"
import { apiClient } from "@/lib/api-client"

interface OfferAnalysisItem {
  buyer_info: string
  current_offer: number
  percentage_of_asking: number
  reason: string
}

interface MarketInsights {
  average_offer_percentage: number
  buyer_engagement_level: string
  pricing_strategy: string
}

interface AnalysisMetadata {
  generated_at: string
  total_offers_analyzed: number
  total_buyers_analyzed: number
}

interface OfferAnalysisData {
  priority_offers: OfferAnalysisItem[]
  fair_offers: OfferAnalysisItem[]
  lowball_offers: OfferAnalysisItem[]
  recommendations: string[]
  market_insights: MarketInsights
  analysis_metadata: AnalysisMetadata
  error?: string
}

interface OfferAnalysisCardProps {
  itemId: number
  itemName: string
}

export function OfferAnalysisCard({ itemId, itemName }: OfferAnalysisCardProps) {
  const [analysis, setAnalysis] = useState<OfferAnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const fetchAnalysis = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiClient.getOfferAnalysis(itemId)
      setAnalysis(result)
      setExpanded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze offers')
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const generated = new Date(timestamp)
    const diffMinutes = Math.floor((now.getTime() - generated.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const getEngagementColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (!analysis && !loading && !error) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">AI Offer Analysis</h3>
                <p className="text-sm text-gray-600">Get smart insights on your offers for "{itemName}"</p>
              </div>
            </div>
            <Button 
              onClick={fetchAnalysis}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get AI Insights
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Analysis Failed</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
            <Button 
              onClick={fetchAnalysis}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analysis) return null

  const totalOffers = analysis.priority_offers.length + analysis.fair_offers.length + analysis.lowball_offers.length

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Offer Analysis</h3>
              <p className="text-sm text-gray-600">
                {analysis.analysis_metadata.total_offers_analyzed} offers from {analysis.analysis_metadata.total_buyers_analyzed} buyers • 
                Generated {formatTimeAgo(analysis.analysis_metadata.generated_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setExpanded(!expanded)}
              variant="outline"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              {expanded ? 'Collapse' : 'View Details'}
            </Button>
            <Button 
              onClick={fetchAnalysis}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">🔥</div>
            <div className="text-sm font-medium text-green-900">Priority</div>
            <div className="text-lg font-bold text-green-700">{analysis.priority_offers.length}</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">⚖️</div>
            <div className="text-sm font-medium text-blue-900">Fair</div>
            <div className="text-lg font-bold text-blue-700">{analysis.fair_offers.length}</div>
          </div>
          
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">📉</div>
            <div className="text-sm font-medium text-orange-900">Lowball</div>
            <div className="text-lg font-bold text-orange-700">{analysis.lowball_offers.length}</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">💡</div>
            <div className="text-sm font-medium text-purple-900">Tips</div>
            <div className="text-lg font-bold text-purple-700">{analysis.recommendations.length}</div>
          </div>
        </div>

        {/* Market Insights */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-gray-900">Market Insights</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Avg Offer:</span>
              <span className="ml-2 font-medium">{analysis.market_insights.average_offer_percentage}%</span>
            </div>
            <div>
              <span className="text-gray-600">Engagement:</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getEngagementColor(analysis.market_insights.buyer_engagement_level)}`}>
                {analysis.market_insights.buyer_engagement_level}
              </span>
            </div>
            <div className="col-span-1">
              <span className="text-gray-600">Strategy:</span>
              <span className="ml-2 text-xs">{analysis.market_insights.pricing_strategy}</span>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="space-y-4">
            {/* Priority Offers */}
            {analysis.priority_offers.length > 0 && (
              <div>
                <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                  🔥 Priority Offers ({analysis.priority_offers.length})
                </h4>
                <div className="space-y-2">
                  {analysis.priority_offers.map((offer, index) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-green-900">{offer.buyer_info}</span>
                        <div className="text-right">
                          <div className="font-bold text-green-700">${offer.current_offer}</div>
                          <div className="text-xs text-green-600">{offer.percentage_of_asking}% of asking</div>
                        </div>
                      </div>
                      <p className="text-sm text-green-700">{offer.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fair Offers */}
            {analysis.fair_offers.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  ⚖️ Fair Offers ({analysis.fair_offers.length})
                </h4>
                <div className="space-y-2">
                  {analysis.fair_offers.map((offer, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-blue-900">{offer.buyer_info}</span>
                        <div className="text-right">
                          <div className="font-bold text-blue-700">${offer.current_offer}</div>
                          <div className="text-xs text-blue-600">{offer.percentage_of_asking}% of asking</div>
                        </div>
                      </div>
                      <p className="text-sm text-blue-700">{offer.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  AI Recommendations
                </h4>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-purple-800 flex items-start gap-2">
                        <span className="text-purple-600">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Lowball Offers (Collapsed by default) */}
            {analysis.lowball_offers.length > 0 && (
              <details className="group">
                <summary className="font-medium text-orange-900 mb-2 flex items-center gap-2 cursor-pointer">
                  📉 Lowball Offers ({analysis.lowball_offers.length}) 
                  <span className="text-xs text-gray-500 ml-2">Click to view</span>
                </summary>
                <div className="space-y-2 mt-2">
                  {analysis.lowball_offers.map((offer, index) => (
                    <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-orange-900">{offer.buyer_info}</span>
                        <div className="text-right">
                          <div className="font-bold text-orange-700">${offer.current_offer}</div>
                          <div className="text-xs text-orange-600">{offer.percentage_of_asking}% of asking</div>
                        </div>
                      </div>
                      <p className="text-sm text-orange-700">{offer.reason}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}