'use client';

import { useState, useEffect } from 'react';
import { Bot, CheckCircle, Clock, Settings } from 'lucide-react';

interface AgentStatusProps {
  sellerId?: string;
  className?: string;
}

interface AgentStats {
  agentEnabled: boolean;
  activeItems: number;
  decisionsLast30Days: {
    total: number;
    accepted: number;
    countered: number;
    declined: number;
  };
}

export function SimpleAgentStatus({ sellerId, className = '' }: AgentStatusProps) {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgentStats();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchAgentStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgentStats = async () => {
    try {
      const response = await fetch('/api/agent/settings');
      if (response.ok) {
        const data = await response.json();
        setStats({
          agentEnabled: data.settings.agentEnabled,
          activeItems: data.statistics.activeItems,
          decisionsLast30Days: data.statistics.decisionsLast30Days,
        });
      }
    } catch (error) {
      console.error('Failed to fetch agent stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="text-sm text-gray-600">Loading agent...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
        <Bot className="h-4 w-4" />
        <span className="text-sm">Agent unavailable</span>
      </div>
    );
  }

  const getStatusColor = () => {
    if (!stats.agentEnabled) return 'text-gray-500';
    return stats.decisionsLast30Days.total > 0 ? 'text-green-500' : 'text-blue-500';
  };

  const getStatusText = () => {
    if (!stats.agentEnabled) return 'Disabled';
    if (stats.activeItems === 0) return 'No active items';
    if (stats.decisionsLast30Days.total === 0) return `Monitoring ${stats.activeItems} items`;
    return `${stats.decisionsLast30Days.total} decisions (30d)`;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative">
        <Bot className={`h-4 w-4 ${getStatusColor()}`} />
        {stats.agentEnabled && stats.activeItems > 0 && (
          <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
        )}
      </div>
      
      <div className="flex flex-col">
        <div className="flex items-center space-x-1">
          <span className="text-sm font-medium text-gray-900">AI Agent</span>
          {stats.agentEnabled && <CheckCircle className="h-3 w-3 text-green-500" />}
        </div>
        <span className="text-xs text-gray-600">
          {getStatusText()}
        </span>
      </div>
      
      {stats.decisionsLast30Days.total > 0 && (
        <div className="text-xs text-gray-500 space-y-1">
          <div>✓ {stats.decisionsLast30Days.accepted}</div>
          <div>↔ {stats.decisionsLast30Days.countered}</div>
          <div>✗ {stats.decisionsLast30Days.declined}</div>
        </div>
      )}
    </div>
  );
}

// Compact version for navigation or sidebar
export function AgentStatusBadge({ className = '' }: { className?: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/agent/settings');
        if (response.ok) {
          const data = await response.json();
          setEnabled(data.settings.agentEnabled);
        }
      } catch (error) {
        console.error('Failed to check agent status:', error);
        setEnabled(false);
      }
    };

    checkStatus();
  }, []);

  if (enabled === null) return null;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Bot className={`h-3 w-3 ${enabled ? 'text-green-500' : 'text-gray-400'}`} />
      <span className="text-xs text-gray-600">
        {enabled ? 'Auto' : 'Manual'}
      </span>
    </div>
  );
}

// Settings toggle component
export function AgentToggle({ className = '' }: { className?: string }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/agent/settings');
      if (response.ok) {
        const data = await response.json();
        setEnabled(data.settings.agentEnabled);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const toggleAgent = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agent/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentEnabled: !enabled }),
      });

      if (response.ok) {
        setEnabled(!enabled);
      }
    } catch (error) {
      console.error('Failed to toggle agent:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Bot className={`h-4 w-4 ${enabled ? 'text-green-500' : 'text-gray-400'}`} />
      <span className="text-sm text-gray-700">AI Agent</span>
      <button
        onClick={toggleAgent}
        disabled={loading}
        className={`
          relative inline-flex h-5 w-9 items-center rounded-full transition-colors
          ${enabled ? 'bg-green-500' : 'bg-gray-300'}
          ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            inline-block h-3 w-3 transform rounded-full bg-white transition-transform
            ${enabled ? 'translate-x-5' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}