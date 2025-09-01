'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings, Activity, Clock } from 'lucide-react'
import { apiClient } from '@/lib/api-client-new'

interface AgentProfile {
  enabled: boolean
  last_activity_at: string | null
  selling_priority: 'best_price' | 'quick_sale'
  target_sale_date: string | null
  setup_source: string | null
}

interface AgentStatusCardProps {
  userId: string
}

export function AgentStatusCard({ userId }: AgentStatusCardProps) {
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAgentStatus = async () => {
      try {
        const headers = await apiClient.getAuthHeaders(true)
        const response = await fetch('/api/seller/agent/status', {
          headers
        })
        if (response.ok) {
          const data = await response.json()
          setAgentProfile(data.agentProfile || null)
        } else if (response.status !== 404) {
          // 404 means no agent profile exists, which is fine
          setError('Failed to load agent status')
        }
      } catch (err) {
        console.error('Error fetching agent status:', err)
        setError('Failed to load agent status')
      } finally {
        setLoading(false)
      }
    }

    fetchAgentStatus()
  }, [userId])

  if (loading) {
    return (
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-slate-300 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 w-24 bg-slate-300 rounded animate-pulse mb-1"></div>
              <div className="h-3 w-32 bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !agentProfile) {
    return null // Don't show anything if no agent profile or error
  }

  const formatLastActivity = (lastActivity: string | null) => {
    if (!lastActivity) return 'Never'
    
    const now = new Date()
    const activityDate = new Date(lastActivity)
    const diffInMinutes = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  return (
    <Card className="bg-white border-orange-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">👩🏽‍🦱</span>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-800">Lola (AI Agent)</span>
                  <Badge 
                    className={`text-xs ${
                      agentProfile.enabled 
                        ? 'bg-green-100 text-green-800 border-green-300' 
                        : 'bg-gray-100 text-gray-800 border-gray-300'
                    }`}
                  >
                    {agentProfile.enabled ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="text-sm text-slate-600">
                  {agentProfile.enabled ? 'Handling offers automatically' : 'Not active'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-xs text-slate-500">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Last response: {formatLastActivity(agentProfile.last_activity_at)}</span>
            </div>
          </div>
        </div>

        {/* Additional details for active agents */}
        {agentProfile.enabled && (
          <div className="mt-3 pt-3 border-t border-orange-200/60 flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs text-slate-600">
              <div className="flex items-center space-x-1">
                <Activity className="w-3 h-3" />
                <span>
                  Priority: {agentProfile.selling_priority === 'best_price' ? 'Best Price' : 'Quick Sale'}
                </span>
              </div>
              {agentProfile.selling_priority === 'quick_sale' && agentProfile.target_sale_date && (
                <div>
                  Target: {new Date(agentProfile.target_sale_date).toLocaleDateString()}
                </div>
              )}
            </div>
            
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
              <Settings className="w-3 h-3 mr-1" />
              Settings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}