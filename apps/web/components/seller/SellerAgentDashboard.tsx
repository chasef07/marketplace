'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, Settings, Eye, MessageSquare, TrendingUp, BarChart3, Power, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { AgentNotifications } from './AgentNotifications'

interface AgentEnabledItem {
  id: number
  name: string
  starting_price: number
  agent_enabled: boolean
  item_status: string
  views_count: number
  created_at: string
  images: any[]
  negotiationsCount: number
  offersCount: number
  highestOffer?: number
}

interface AgentDecision {
  id: number
  decision_type: string
  original_offer_price: number
  recommended_price?: number
  confidence_score: number
  reasoning: string
  created_at: string
  market_conditions: any
  items: {
    name: string
  }
}

interface User {
  id: string
  username: string
}

interface SellerAgentDashboardProps {
  user: User
  onBack: () => void
  onNavigateAgentSettings?: () => void
}

export function SellerAgentDashboard({ user, onBack, onNavigateAgentSettings }: SellerAgentDashboardProps) {
  const [items, setItems] = useState<AgentEnabledItem[]>([])
  const [recentDecisions, setRecentDecisions] = useState<AgentDecision[]>([])
  const [loading, setLoading] = useState(true)
  const [agentStats, setAgentStats] = useState({
    totalAgentItems: 0,
    totalDecisions: 0,
    averageConfidence: 0,
    successfulDeals: 0
  })

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [user.id])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load seller's items with negotiation counts
      const { data: itemsData } = await supabase
        .from('items')
        .select(`
          id,
          name,
          starting_price,
          agent_enabled,
          item_status,
          views_count,
          created_at,
          images,
          negotiations(
            id,
            status,
            offers(id, price, offer_type)
          )
        `)
        .eq('seller_id', user.id)
        .in('item_status', ['active', 'under_negotiation', 'sold'])
        .order('created_at', { ascending: false })

      // Process items data
      const processedItems = itemsData?.map(item => {
        const negotiations = item.negotiations || []
        const offers = negotiations.flatMap(n => n.offers || [])
        const buyerOffers = offers.filter(o => o.offer_type === 'buyer')
        
        return {
          ...item,
          negotiationsCount: negotiations.length,
          offersCount: buyerOffers.length,
          highestOffer: buyerOffers.length > 0 ? Math.max(...buyerOffers.map(o => parseFloat(o.price))) : undefined
        }
      }) || []

      setItems(processedItems)

      // Load recent agent decisions
      const { data: decisionsData } = await supabase
        .from('agent_decisions')
        .select(`
          id,
          decision_type,
          original_offer_price,
          recommended_price,
          confidence_score,
          reasoning,
          created_at,
          market_conditions,
          items!inner(name)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setRecentDecisions(decisionsData || [])

      // Calculate stats
      const agentEnabledItems = processedItems.filter(item => item.agent_enabled)
      const totalDecisions = decisionsData?.length || 0
      const avgConfidence = decisionsData?.length > 0 
        ? decisionsData.reduce((sum, d) => sum + (d.confidence_score || 0), 0) / decisionsData.length 
        : 0
      const successfulDeals = processedItems.filter(item => item.item_status === 'sold' && item.agent_enabled).length

      setAgentStats({
        totalAgentItems: agentEnabledItems.length,
        totalDecisions,
        averageConfidence: avgConfidence,
        successfulDeals
      })

    } catch (error) {
      console.error('Error loading seller agent data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleItemAgent = async (itemId: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ agent_enabled: !currentStatus })
        .eq('id', itemId)
        .eq('seller_id', user.id)

      if (!error) {
        // Update local state
        setItems(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, agent_enabled: !currentStatus }
            : item
        ))
      }
    } catch (error) {
      console.error('Error toggling agent:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'ACCEPT': return 'text-green-600 bg-green-50'
      case 'COUNTER': return 'text-blue-600 bg-blue-50'
      case 'DECLINE': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack}>
                ← Back to Profile
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Bot className="w-6 h-6 mr-2 text-blue-600" />
                  AI Agent Dashboard
                </h1>
                <p className="text-gray-600">Manage your autonomous selling assistant</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="flex items-center"
              onClick={onNavigateAgentSettings}
            >
              <Settings className="w-4 h-4 mr-2" />
              Agent Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Agent-Enabled Items</p>
                <p className="text-2xl font-bold text-gray-900">{agentStats.totalAgentItems}</p>
              </div>
              <Bot className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Decisions</p>
                <p className="text-2xl font-bold text-gray-900">{agentStats.totalDecisions}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                <p className="text-2xl font-bold text-gray-900">{(agentStats.averageConfidence * 100).toFixed(0)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Agent Sales</p>
                <p className="text-2xl font-bold text-gray-900">{agentStats.successfulDeals}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-orange-600" />
            </div>
          </Card>
        </div>

        {/* Agent Notifications */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">🤖 Agent Recommendations</h2>
          </div>
          <AgentNotifications />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Your Items */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your Listings</h2>
              <span className="text-sm text-gray-500">{items.length} total</span>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <button
                        onClick={() => toggleItemAgent(item.id, item.agent_enabled)}
                        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          item.agent_enabled 
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Power className={`w-3 h-3 ${item.agent_enabled ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span>{item.agent_enabled ? 'Agent ON' : 'Agent OFF'}</span>
                      </button>
                    </div>
                    
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                      <span>{formatCurrency(item.starting_price)}</span>
                      <span>•</span>
                      <span className="flex items-center">
                        <Eye className="w-3 h-3 mr-1" />
                        {item.views_count} views
                      </span>
                      {item.offersCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600">
                            {item.offersCount} offers
                          </span>
                        </>
                      )}
                      {item.highestOffer && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 font-medium">
                            Best: {formatCurrency(item.highestOffer)}
                          </span>
                        </>
                      )}
                    </div>
                    
                    <div className="mt-1 flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        item.item_status === 'active' ? 'bg-green-100 text-green-800' :
                        item.item_status === 'under_negotiation' ? 'bg-yellow-100 text-yellow-800' :
                        item.item_status === 'sold' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.item_status.replace('_', ' ')}
                      </span>
                      {item.agent_enabled && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          🤖 AI Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {items.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No listings yet</p>
                  <p className="text-sm">Create your first listing to get started</p>
                </div>
              )}
            </div>
          </Card>

          {/* Recent Agent Decisions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent AI Decisions</h2>
              <span className="text-sm text-gray-500">{recentDecisions.length} decisions</span>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {recentDecisions.map((decision) => (
                <div key={decision.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getDecisionColor(decision.decision_type)}`}>
                      {decision.decision_type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(decision.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 mb-1">{decision.items.name}</h4>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Offer:</span>
                      <span className="font-medium">{formatCurrency(decision.original_offer_price)}</span>
                    </div>
                    {decision.recommended_price && (
                      <div className="flex justify-between">
                        <span>Recommended:</span>
                        <span className="font-medium text-blue-600">{formatCurrency(decision.recommended_price)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Confidence:</span>
                      <span className="font-medium">{(decision.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  
                  {decision.reasoning && (
                    <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                      {decision.reasoning}
                    </p>
                  )}
                </div>
              ))}
              
              {recentDecisions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No AI decisions yet</p>
                  <p className="text-sm">Enable the agent on your listings to see decisions here</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}