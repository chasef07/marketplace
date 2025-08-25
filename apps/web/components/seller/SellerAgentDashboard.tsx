'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, Settings, Eye, MessageSquare, TrendingUp, BarChart3, Power, Package } from 'lucide-react'
import { createClient } from '@/src/lib/supabase'
import { AgentNotifications } from './AgentNotifications'
import { NegotiationTimeline } from './NegotiationTimeline'
import type { RealtimeChannel } from '@supabase/supabase-js'

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
  const [manualProcessing, setManualProcessing] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [channels, setChannels] = useState<RealtimeChannel[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)

  const supabase = createClient()

  // Memoize loadData to prevent unnecessary re-renders
  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // Load seller's items with negotiation counts
      const { data: itemsData } = await supabase
        .from('items')
        .select(`
          id,
          name,
          starting_price,
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

      // Try to get seller agent profile to check if agent is enabled at seller level
      let sellerAgentProfile = null
      try {
        const { data } = await supabase
          .from('seller_agent_profile')
          .select('enabled')
          .eq('seller_id', user.id)
          .single()
        sellerAgentProfile = data
      } catch (err) {
        // seller_agent_profile table may not exist yet
        console.log('Seller agent profile not found, defaulting to agent enabled')
      }

      // Process items data
      const processedItems = itemsData?.map(item => {
        const negotiations = item.negotiations || []
        const offers = negotiations.flatMap((n: any) => n.offers || [])
        const buyerOffers = offers.filter((o: any) => o.offer_type === 'buyer')
        
        // Default agent to enabled (opt-out feature)
        const agentEnabled = sellerAgentProfile?.enabled ?? true
        
        return {
          ...item,
          agent_enabled: agentEnabled,
          negotiationsCount: negotiations.length,
          offersCount: buyerOffers.length,
          highestOffer: buyerOffers.length > 0 ? Math.max(...buyerOffers.map((o: any) => parseFloat(o.price))) : undefined
        }
      }) || []

      setItems(processedItems)

      // Try to load recent agent decisions
      let decisionsData: any[] = []
      try {
        const { data } = await supabase
          .from('agent_decisions')
          .select('*')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (data) {
          // Get item names for the decisions
          const itemIds = [...new Set(data.map(d => d.item_id).filter(Boolean))]
          let itemsMap: Record<string, any> = {}
          
          if (itemIds.length > 0) {
            const { data: itemsData } = await supabase
              .from('items')
              .select('id, name')
              .in('id', itemIds)
            
            itemsMap = itemsData?.reduce((acc, item) => ({
              ...acc,
              [item.id]: item
            }), {}) || {}
          }
          
          decisionsData = data.map(decision => ({
            ...decision,
            items: { name: itemsMap[decision.item_id]?.name || 'Unknown Item' }
          }))
        }
      } catch (err) {
        console.log('Agent decisions table may not exist yet, showing empty decisions')
      }

      setRecentDecisions(decisionsData)

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
  }, [user.id, supabase])

  // Initial data load
  useEffect(() => {
    loadData()
  }, [loadData])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user.id) return

    console.log('🔄 Setting up real-time subscriptions for seller agent dashboard')
    
    const newChannels: RealtimeChannel[] = []

    // Subscribe to agent decisions for this seller
    const agentDecisionsChannel = supabase
      .channel(`agent_decisions_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_decisions',
          filter: `seller_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🤖 New agent decision received:', payload.new)
          setLastUpdateTime(new Date())
          
          // Add the new decision to state instead of full reload for better performance
          setRecentDecisions(prev => {
            const newDecision = {
              ...payload.new,
              items: { name: 'Loading...' } // Will be updated in full reload if needed
            } as AgentDecision
            
            // Add to beginning and limit to 10
            const updated = [newDecision, ...prev].slice(0, 10)
            return updated
          })
          
          // Update stats as well
          setAgentStats(prev => ({
            ...prev,
            totalDecisions: prev.totalDecisions + 1,
            averageConfidence: prev.totalDecisions > 0 
              ? ((prev.averageConfidence * prev.totalDecisions) + (payload.new.confidence_score || 0)) / (prev.totalDecisions + 1)
              : (payload.new.confidence_score || 0)
          }))
          
          // Do a partial reload to get complete decision data with item name
          setTimeout(() => loadData(), 1000)
        }
      )
      .on('subscribe', (status: any) => {
        console.log('🔄 Agent decisions subscription status:', status)
      })
      .subscribe()

    newChannels.push(agentDecisionsChannel)

    // Subscribe to offers for this seller's items
    const offersChannel = supabase
      .channel(`offers_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offers'
        },
        async (payload) => {
          // Check if this offer is for one of our items
          const { data: negotiation } = await supabase
            .from('negotiations')
            .select('seller_id, item_id')
            .eq('id', payload.new.negotiation_id)
            .single()

          if (negotiation?.seller_id === user.id) {
            console.log('💰 New offer received for seller item:', payload.new)
            setLastUpdateTime(new Date())
            // Refresh data to update offer counts and stats
            loadData()
          }
        }
      )
      .on('subscribe', (status: any) => {
        console.log('🔄 Offers subscription status:', status)
      })
      .subscribe()

    newChannels.push(offersChannel)

    // Subscribe to item status changes for this seller
    const itemsChannel = supabase
      .channel(`items_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'items',
          filter: `seller_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📦 Item updated:', payload.new)
          setLastUpdateTime(new Date())
          // Update the specific item in local state
          setItems(prev => prev.map(item => 
            item.id === payload.new.id 
              ? { ...item, ...payload.new }
              : item
          ))
        }
      )
      .on('subscribe', (status: any) => {
        console.log('🔄 Items subscription status:', status)
      })
      .subscribe()

    newChannels.push(itemsChannel)

    setChannels(newChannels)

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up real-time subscriptions')
      newChannels.forEach(channel => {
        supabase.removeChannel(channel)
      })
      setChannels([])
    }
  }, [user.id, supabase, loadData])

  // Development auto-processing for local testing
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🤖 Starting development agent auto-processing (every 15s)')
      
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/agent/cron', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maxTasks: 5 })
          })
          
          const result = await response.json()
          if (result.processed > 0) {
            console.log(`🤖 Dev auto-processing: ${result.processed} offers processed`)
            // Note: loadData will be called via real-time subscriptions
            // but we keep this for cases where subscriptions might fail
          }
        } catch (error) {
          console.error('🤖 Dev agent processing failed:', error)
        }
      }, 15000) // Every 15 seconds

      return () => {
        console.log('🤖 Stopping development agent auto-processing')
        clearInterval(interval)
      }
    }
  }, [])

  const toggleItemAgent = async (itemId: number, currentStatus: boolean) => {
    try {
      // Since agent_enabled column may not exist at item level,
      // direct users to agent settings for now
      alert('Agent settings are managed at the account level. Use Agent Settings to control the agent for all your items.')
      
    } catch (error) {
      console.error('Error toggling agent:', error)
      alert('Failed to toggle agent. Please try again.')
    }
  }

  const manualProcessOffers = async () => {
    setManualProcessing(true)
    try {
      console.log('🔧 Manual processing started...')
      
      const response = await fetch('/api/agent/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxTasks: 10 })
      })
      
      const result = await response.json()
      console.log('🔧 Manual processing result:', result)
      
      if (result.processed > 0) {
        console.log(`🔧 Processed ${result.processed} offers manually`)
        await loadData() // Refresh dashboard
      } else {
        console.log('🔧 No offers to process')
      }
      
      alert(`Manual processing complete: ${result.processed} offers processed`)
    } catch (error) {
      console.error('🔧 Manual processing failed:', error)
      alert('Manual processing failed: ' + (error as Error).message)
    } finally {
      setManualProcessing(false)
    }
  }

  const debugAgentFlow = async () => {
    try {
      console.log('🐛 Fetching debug info...')
      
      const response = await fetch('/api/debug/agent-flow')
      const result = await response.json()
      
      console.log('🐛 Debug info:', result)
      setDebugInfo(result)
      
      // Show summary in alert
      if (result.success) {
        const analysis = result.analysis
        alert(`Debug Info:
• Queue pending: ${analysis.queue_has_pending}
• Recent buyer offers: ${analysis.recent_buyer_offers}
• Agent-enabled items (via offers): ${analysis.agent_enabled_items_via_offers}
• Agent-enabled items (direct): ${analysis.agent_enabled_items_direct}
• Total decisions: ${analysis.total_decisions}
• Offers missing decisions: ${analysis.offers_missing_decisions}
• Decision rate: ${analysis.decision_rate}%
• Sellers with agent: ${analysis.sellers_with_agent}

Check console for full details.`)
      }
    } catch (error) {
      console.error('🐛 Debug failed:', error)
      alert('Debug failed: ' + (error as Error).message)
    }
  }

  const testTrigger = async () => {
    try {
      console.log('🔬 Testing trigger for latest offer...')
      
      const response = await fetch('/api/debug/test-trigger')
      const result = await response.json()
      
      console.log('🔬 Trigger test result:', result)
      
      if (result.success) {
        const analysis = result.analysis
        const failingConditions = analysis.failing_conditions || []
        
        let alertMessage = `Trigger Test Results:
• Should trigger: ${analysis.trigger_should_fire}
• Was queued: ${analysis.queue_entry_exists}
• Decision made: ${analysis.decision_exists}

FAILING CONDITIONS: ${failingConditions.length > 0 ? failingConditions.join(', ') : 'None'}

Conditions Check:
• Is buyer offer: ${analysis.conditions?.is_buyer_offer}
• Seller agent enabled: ${analysis.conditions?.seller_agent_enabled}
• Item agent enabled: ${analysis.conditions?.item_agent_enabled}
• Seller profile exists: ${analysis.conditions?.seller_profile_exists}
• Item exists: ${analysis.conditions?.item_exists}

IDs: Seller ${analysis.seller_id}, Item ${analysis.item_id}, Offer ${analysis.offer_id}`

        // If seller profile is missing, offer to fix it
        if (failingConditions.includes('seller_profile_exists')) {
          alertMessage += `

⚠️ SELLER PROFILE MISSING! 
Click "🔧 Fix Profile" to create it.`
        }

        alert(alertMessage + '\n\nCheck console for full details.')
      }
    } catch (error) {
      console.error('🔬 Trigger test failed:', error)
      alert('Trigger test failed: ' + (error as Error).message)
    }
  }

  const fixSellerProfile = async () => {
    try {
      console.log('🔧 Creating seller agent profile...')
      
      const response = await fetch('/api/debug/fix-seller-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seller_id: user.id })
      })
      
      const result = await response.json()
      console.log('🔧 Fix profile result:', result)
      
      if (result.success) {
        alert(`✅ Seller agent profile ${result.message.includes('already') ? 'already exists' : 'created successfully'}!

Now test the trigger again to verify it works.`)
      } else {
        alert(`❌ Failed to create seller profile: ${result.error}`)
      }
    } catch (error) {
      console.error('🔧 Fix profile failed:', error)
      alert('Fix profile failed: ' + (error as Error).message)
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
                  {channels.length > 0 && (
                    <span className="ml-3 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 ml-1 font-normal">Live</span>
                    </span>
                  )}
                </h1>
                <p className="text-gray-600">
                  Manage your autonomous selling assistant
                  {channels.length > 0 && (
                    <span className="text-green-600 text-sm ml-2">
                      • Real-time updates active
                      {lastUpdateTime && (
                        <span className="text-gray-500 ml-2">
                          (Last update: {lastUpdateTime.toLocaleTimeString()})
                        </span>
                      )}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={debugAgentFlow}
              >
                🐛 Debug
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={testTrigger}
              >
                🔬 Test Trigger
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={fixSellerProfile}
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              >
                🔧 Fix Profile
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={manualProcessing}
                onClick={manualProcessOffers}
              >
                {manualProcessing ? '⏳ Processing...' : '🔧 Manual Process'}
              </Button>
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

        {/* Negotiation Timeline */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">📈 Negotiation Timeline</h2>
            <p className="text-sm text-gray-600">Recent AI agent negotiations and decisions</p>
          </div>
          <NegotiationTimeline sellerId={user.id} />
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