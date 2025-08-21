'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Save, RotateCcw, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface AgentSettings {
  aggressiveness_level: number
  auto_accept_threshold: number
  min_acceptable_ratio: number
  response_delay_minutes: number
  agent_enabled: boolean
}

interface User {
  id: string
  username: string
}

interface AgentSettingsProps {
  user: User
  onClose?: () => void
}

export function AgentSettings({ user, onClose }: AgentSettingsProps) {
  const [settings, setSettings] = useState<AgentSettings>({
    aggressiveness_level: 0.5,
    auto_accept_threshold: 0.95,
    min_acceptable_ratio: 0.75,
    response_delay_minutes: 0,
    agent_enabled: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [user.id])

  const loadSettings = async () => {
    try {
      setLoading(true)
      
      // Load existing agent settings
      const { data: existingSettings } = await supabase
        .from('seller_agent_profile')
        .select('*')
        .eq('seller_id', user.id)
        .single()

      if (existingSettings) {
        setSettings({
          aggressiveness_level: existingSettings.aggressiveness_level || 0.5,
          auto_accept_threshold: existingSettings.auto_accept_threshold || 0.95,
          min_acceptable_ratio: existingSettings.min_acceptable_ratio || 0.75,
          response_delay_minutes: existingSettings.response_delay_minutes || 0,
          agent_enabled: existingSettings.agent_enabled ?? true
        })
      }
    } catch (error) {
      console.error('Error loading agent settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (key: keyof AgentSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const saveSettings = async () => {
    try {
      setSaving(true)

      // Upsert agent settings
      const { error } = await supabase
        .from('seller_agent_profile')
        .upsert({
          seller_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'seller_id'
        })

      if (error) {
        console.error('Error saving settings:', error)
        alert('Failed to save settings. Please try again.')
        return
      }

      setHasChanges(false)
      alert('Settings saved successfully!')
      
    } catch (error) {
      console.error('Error saving agent settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setSettings({
      aggressiveness_level: 0.5,
      auto_accept_threshold: 0.95,
      min_acceptable_ratio: 0.75,
      response_delay_minutes: 0,
      agent_enabled: true
    })
    setHasChanges(true)
  }

  const getAggressivenessLabel = (level: number) => {
    if (level <= 0.3) return 'Conservative'
    if (level <= 0.7) return 'Balanced'
    return 'Aggressive'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
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
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {onClose && (
                <Button variant="ghost" onClick={onClose}>
                  ← Back
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Settings className="w-6 h-6 mr-2 text-blue-600" />
                  AI Agent Settings
                </h1>
                <p className="text-gray-600">Configure how your autonomous selling assistant behaves</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Global Agent Toggle */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Global Agent Status</h2>
              <p className="text-sm text-gray-600">Enable or disable the AI agent for all your listings</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.agent_enabled}
                onChange={(e) => handleSettingChange('agent_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </Card>

        {/* Agent Personality Settings */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Personality</h2>
          
          <div className="space-y-6">
            {/* Aggressiveness Level */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Aggressiveness Level
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {getAggressivenessLabel(settings.aggressiveness_level)}
                  </span>
                  <Info className="w-4 h-4 text-gray-400" title="How aggressive the agent is in negotiations" />
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.aggressiveness_level}
                onChange={(e) => handleSettingChange('aggressiveness_level', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Conservative</span>
                <span>Balanced</span>
                <span>Aggressive</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Conservative: Accepts lower offers quickly. Aggressive: Holds out for better prices.
              </p>
            </div>

            {/* Auto-Accept Threshold */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Auto-Accept Threshold
                </label>
                <span className="text-sm text-gray-600">
                  {Math.round(settings.auto_accept_threshold * 100)}% of listing price
                </span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1"
                step="0.01"
                value={settings.auto_accept_threshold}
                onChange={(e) => handleSettingChange('auto_accept_threshold', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-xs text-gray-600 mt-2">
                Automatically accept offers at or above this percentage of your listing price.
              </p>
            </div>

            {/* Minimum Acceptable Ratio */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Minimum Acceptable Ratio
                </label>
                <span className="text-sm text-gray-600">
                  {Math.round(settings.min_acceptable_ratio * 100)}% of listing price
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.9"
                step="0.01"
                value={settings.min_acceptable_ratio}
                onChange={(e) => handleSettingChange('min_acceptable_ratio', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-xs text-gray-600 mt-2">
                The agent will decline offers below this percentage automatically.
              </p>
            </div>

            {/* Response Delay */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Response Delay
                </label>
                <span className="text-sm text-gray-600">
                  {settings.response_delay_minutes} minutes
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={settings.response_delay_minutes}
                onChange={(e) => handleSettingChange('response_delay_minutes', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-xs text-gray-600 mt-2">
                How long to wait before responding to offers (0 = immediate response).
              </p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            disabled={saving}
            className="flex items-center"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>

          <div className="flex space-x-3">
            {onClose && (
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
            )}
            <Button
              onClick={saveSettings}
              disabled={!hasChanges || saving}
              className="flex items-center bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How Agent Settings Work</p>
              <ul className="space-y-1 text-xs">
                <li>• These settings apply to all items where the AI agent is enabled</li>
                <li>• You can still enable/disable the agent per individual listing</li>
                <li>• The agent uses game theory and market analysis for optimal decisions</li>
                <li>• You'll receive notifications for all agent recommendations</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}