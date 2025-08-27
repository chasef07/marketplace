'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Bot,
  User,
  Clock,
  DollarSign,
  MessageSquare,
  AlertTriangle,
  Activity
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface TimelineOffer {
  id: number
  price: number
  message?: string
  offer_type: 'buyer' | 'seller'
  created_at: string
  buyer_id?: number
  seller_id?: number
  agent_generated?: boolean
  agent_decision_id?: number
}

interface AgentDecision {
  id: number
  decision_type: 'ACCEPT' | 'COUNTER' | 'DECLINE'
  original_offer_price: number
  recommended_price?: number
  confidence_score: number
  reasoning: string
  created_at: string
  market_conditions?: any
  validation_warnings?: string[]
  negotiation_context?: {
    round: number
    momentum: 'positive' | 'negative' | 'neutral'
    price_direction: 'up' | 'down' | 'stable'
  }
}

interface NegotiationTimeline {
  id: number
  item_id: number
  item_name: string
  status: string
  created_at: string
  updated_at: string
  starting_price: number
  latest_offer_price?: number
  offer_count: number
  offers: TimelineOffer[]
  agent_decisions: AgentDecision[]
}

interface NegotiationTimelineProps {
  sellerId: string
  className?: string
}

export function NegotiationTimeline({ sellerId, className }: NegotiationTimelineProps) {
  const [negotiations, setNegotiations] = useState<NegotiationTimeline[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedNegotiations, setExpandedNegotiations] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const loadNegotiations = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get negotiations with offers - use basic query to avoid type issues
      const { data: negotiationsData, error: negotiationsError } = await supabase
        .from('negotiations')
        .select('*')
        .eq('seller_id', sellerId)
        .in('status', ['active', 'deal_pending', 'completed'])
        .order('updated_at', { ascending: false })
        .limit(10)

      if (negotiationsError) {
        throw negotiationsError
      }

      if (!negotiationsData || negotiationsData.length === 0) {
        setNegotiations([])
        return
      }

      // Get item information for these negotiations
      const itemIds = negotiationsData.map(n => n.item_id)
      const { data: itemsData } = await supabase
        .from('items')
        .select('id, name, starting_price')
        .in('id', itemIds)

      // Get offers for these negotiations
      const negotiationIds = negotiationsData.map(n => n.id)
      const { data: offersData } = await supabase
        .from('offers')
        .select('*')
        .in('negotiation_id', negotiationIds)
        .order('created_at', { ascending: true })

      // Try to get agent decisions - using raw query to handle missing table gracefully
      let agentDecisionsData: any[] = []
      try {
        const { data: decisions } = await supabase
          .rpc('get_agent_decisions_for_negotiations', { 
            negotiation_ids: negotiationIds 
          })
          .returns<AgentDecision[]>()
        
        if (decisions && Array.isArray(decisions)) {
          agentDecisionsData = decisions
        }
      } catch {
        console.log('Agent decisions table may not exist yet, continuing without agent data')
        // Continue without agent decisions if the table doesn't exist
      }

      // Process and combine the data
      const processedNegotiations = negotiationsData?.map(negotiation => {
        const item = itemsData?.find(i => i.id === negotiation.item_id)
        const offers = (offersData || [])
          .filter(o => o.negotiation_id === negotiation.id)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        
        const agentDecisions = agentDecisionsData
          .filter(d => d.negotiation_id === negotiation.id)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

        const latestOffer = offers[offers.length - 1]

        return {
          id: negotiation.id,
          item_id: negotiation.item_id,
          item_name: item?.name || 'Unknown Item',
          status: negotiation.status,
          created_at: negotiation.created_at,
          updated_at: negotiation.updated_at,
          starting_price: item?.starting_price || 0,
          latest_offer_price: latestOffer?.price,
          offer_count: offers.length,
          offers: offers.map(offer => ({
            id: offer.id,
            price: parseFloat(offer.price),
            message: offer.message,
            offer_type: offer.offer_type,
            created_at: offer.created_at,
            buyer_id: offer.buyer_id,
            seller_id: offer.seller_id,
            agent_generated: offer.agent_generated || false,
            agent_decision_id: offer.agent_decision_id
          })),
          agent_decisions: agentDecisions
        } as NegotiationTimeline
      }) || []

      setNegotiations(processedNegotiations)

    } catch (error) {
      console.error('Error loading negotiation timeline:', error)
      setError('Failed to load negotiation timeline')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sellerId) {
      loadNegotiations()
    }
  }, [sellerId])

  const toggleExpanded = (negotiationId: number) => {
    const newExpanded = new Set(expandedNegotiations)
    if (newExpanded.has(negotiationId)) {
      newExpanded.delete(negotiationId)
    } else {
      newExpanded.add(negotiationId)
    }
    setExpandedNegotiations(newExpanded)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'deal_pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'ACCEPT': return 'text-green-600'
      case 'COUNTER': return 'text-blue-600'
      case 'DECLINE': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getMomentumIcon = (momentum?: string) => {
    switch (momentum) {
      case 'positive': return <TrendingUp className="w-3 h-3 text-green-500" />
      case 'negative': return <TrendingDown className="w-3 h-3 text-red-500" />
      default: return <Minus className="w-3 h-3 text-gray-400" />
    }
  }

  const getPriceTrend = (offers: TimelineOffer[]) => {
    if (offers.length < 2) return null
    
    const buyerOffers = offers.filter(o => o.offer_type === 'buyer')
    if (buyerOffers.length < 2) return null
    
    const latest = buyerOffers[buyerOffers.length - 1]
    const previous = buyerOffers[buyerOffers.length - 2]
    
    const change = latest.price - previous.price
    if (change > 0) return { direction: 'up', amount: change }
    if (change < 0) return { direction: 'down', amount: Math.abs(change) }
    return { direction: 'stable', amount: 0 }
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-red-600">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadNegotiations}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  if (negotiations.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No recent negotiations found</p>
          <p className="text-sm">Agent negotiations will appear here</p>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {negotiations.map((negotiation) => {
        const isExpanded = expandedNegotiations.has(negotiation.id)
        const priceTrend = getPriceTrend(negotiation.offers)
        
        return (
          <Card key={negotiation.id} className="overflow-hidden">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpanded(negotiation.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-gray-900">{negotiation.item_name}</h3>
                        <Badge className={getStatusColor(negotiation.status)}>
                          {negotiation.status.replace('_', ' ')}
                        </Badge>
                        {negotiation.agent_decisions.length > 0 && (
                          <Badge variant="outline" className="text-purple-600 border-purple-200">
                            <Bot className="w-3 h-3 mr-1" />
                            AI Active
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          <span>Started: {formatCurrency(negotiation.starting_price)}</span>
                        </div>
                        
                        {negotiation.latest_offer_price && (
                          <div className="flex items-center">
                            <span>Latest: {formatCurrency(negotiation.latest_offer_price)}</span>
                            {priceTrend && priceTrend.direction !== 'stable' && (
                              <span className={`ml-2 flex items-center ${
                                priceTrend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {priceTrend.direction === 'up' ? 
                                  <TrendingUp className="w-3 h-3 mr-1" /> : 
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                }
                                {formatCurrency(priceTrend.amount)}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          <span>{negotiation.offer_count} offers</span>
                        </div>
                        
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{formatDateTime(negotiation.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {negotiation.agent_decisions.length > 0 && (
                        <div className="text-xs text-purple-600 font-medium">
                          {negotiation.agent_decisions.length} AI decisions
                        </div>
                      )}
                      {isExpanded ? 
                        <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      }
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="border-t bg-gray-50 p-4">
                  <h4 className="font-medium text-gray-900 mb-4">Negotiation Timeline</h4>
                  
                  <div className="space-y-4">
                    {negotiation.offers.map((offer, index) => {
                      // Find corresponding agent decision
                      const agentDecision = negotiation.agent_decisions.find(
                        d => d.id === offer.agent_decision_id
                      )
                      
                      // Find agent decision that led to this offer (for seller offers)
                      const leadingDecision = offer.offer_type === 'seller' && offer.agent_generated
                        ? negotiation.agent_decisions.find(d => 
                            new Date(d.created_at).getTime() <= new Date(offer.created_at).getTime() &&
                            d.recommended_price === offer.price
                          )
                        : null

                      const isLastOffer = index === negotiation.offers.length - 1
                      
                      return (
                        <div key={offer.id} className="relative">
                          {/* Timeline line */}
                          {!isLastOffer && (
                            <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
                          )}
                          
                          <div className="flex space-x-4">
                            {/* Timeline dot */}
                            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                              offer.offer_type === 'buyer' 
                                ? 'bg-blue-100 text-blue-600' 
                                : offer.agent_generated 
                                  ? 'bg-purple-100 text-purple-600'
                                  : 'bg-green-100 text-green-600'
                            }`}>
                              {offer.offer_type === 'buyer' ? (
                                <User className="w-5 h-5" />
                              ) : offer.agent_generated ? (
                                <Bot className="w-5 h-5" />
                              ) : (
                                <User className="w-5 h-5" />
                              )}
                            </div>
                            
                            {/* Offer content */}
                            <div className="flex-1 min-w-0">
                              <Card className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="font-medium text-gray-900">
                                        {offer.offer_type === 'buyer' ? 'Buyer Offer' : 
                                         offer.agent_generated ? 'AI Agent Counter' : 'Seller Counter'}
                                      </span>
                                      <span className="text-lg font-bold text-gray-900">
                                        {formatCurrency(offer.price)}
                                      </span>
                                      {offer.agent_generated && (
                                        <Badge variant="outline" className="text-purple-600 border-purple-200">
                                          <Bot className="w-3 h-3 mr-1" />
                                          AI Generated
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {formatDateTime(offer.created_at)}
                                    </div>
                                  </div>
                                  
                                  {index > 0 && (
                                    <div className="text-sm">
                                      {(() => {
                                        const prevOffer = negotiation.offers[index - 1]
                                        const change = offer.price - prevOffer.price
                                        if (change > 0) {
                                          return (
                                            <span className="text-green-600 flex items-center">
                                              <TrendingUp className="w-3 h-3 mr-1" />
                                              +{formatCurrency(change)}
                                            </span>
                                          )
                                        } else if (change < 0) {
                                          return (
                                            <span className="text-red-600 flex items-center">
                                              <TrendingDown className="w-3 h-3 mr-1" />
                                              {formatCurrency(change)}
                                            </span>
                                          )
                                        }
                                        return null
                                      })()}
                                    </div>
                                  )}
                                </div>
                                
                                {offer.message && (
                                  <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded">
                                    &ldquo;{offer.message}&rdquo;
                                  </p>
                                )}
                                
                                {/* Agent decision details */}
                                {(agentDecision || leadingDecision) && (
                                  <div className="border-t pt-3 mt-3">
                                    {(() => {
                                      const decision = agentDecision || leadingDecision
                                      if (!decision) return null
                                      return (
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                              <span className={`text-sm font-medium ${getDecisionColor(decision.decision_type)}`}>
                                                AI Decision: {decision.decision_type}
                                              </span>
                                              <div className="flex items-center space-x-1">
                                                <span className="text-xs text-gray-500">Confidence:</span>
                                                <Progress 
                                                  value={decision.confidence_score * 100} 
                                                  className="w-16 h-2"
                                                />
                                                <span className="text-xs font-medium">
                                                  {(decision.confidence_score * 100).toFixed(0)}%
                                                </span>
                                              </div>
                                            </div>
                                            
                                            {decision.negotiation_context && (
                                              <div className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-500">
                                                  Round {decision.negotiation_context.round}
                                                </span>
                                                {getMomentumIcon(decision.negotiation_context.momentum)}
                                              </div>
                                            )}
                                          </div>
                                          
                                          {decision.reasoning && (
                                            <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                                              <strong>AI Reasoning:</strong> {decision.reasoning}
                                            </p>
                                          )}
                                          
                                          {decision.validation_warnings && decision.validation_warnings.length > 0 && (
                                            <div className="flex items-start space-x-2 bg-yellow-50 p-2 rounded">
                                              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                              <div className="text-xs text-yellow-800">
                                                <strong>Validation Warnings:</strong>
                                                <ul className="mt-1 space-y-1">
                                                  {decision.validation_warnings.map((warning, i) => (
                                                    <li key={i}>• {warning}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })()}
                                  </div>
                                )}
                              </Card>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Negotiation summary */}
                  {negotiation.agent_decisions.length > 0 && (
                    <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                      <h5 className="font-medium text-purple-900 mb-2">AI Agent Summary</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-purple-600 font-medium">Decisions Made:</span>
                          <div className="text-purple-900">{negotiation.agent_decisions.length}</div>
                        </div>
                        <div>
                          <span className="text-purple-600 font-medium">Avg Confidence:</span>
                          <div className="text-purple-900">
                            {negotiation.agent_decisions.length > 0 
                              ? (negotiation.agent_decisions.reduce((sum, d) => sum + d.confidence_score, 0) / negotiation.agent_decisions.length * 100).toFixed(0)
                              : 0}%
                          </div>
                        </div>
                        <div>
                          <span className="text-purple-600 font-medium">Decision Types:</span>
                          <div className="text-purple-900">
                            {Object.entries(
                              negotiation.agent_decisions.reduce((acc, d) => {
                                acc[d.decision_type] = (acc[d.decision_type] || 0) + 1
                                return acc
                              }, {} as Record<string, number>)
                            ).map(([type, count]) => `${type}: ${count}`).join(', ')}
                          </div>
                        </div>
                        <div>
                          <span className="text-purple-600 font-medium">Last Decision:</span>
                          <div className="text-purple-900">
                            {formatDateTime(negotiation.agent_decisions[negotiation.agent_decisions.length - 1]?.created_at || '')}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )
      })}
    </div>
  )
}