'use client';

import { useState, useEffect } from 'react';
import { Bot, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface AgentStatusProps {
  itemId: number;
  className?: string;
}

interface AgentStatus {
  agentEnabled: boolean;
  targetPrice?: number;
  strategyMode?: string;
  recentDecisions: Array<{
    id: number;
    decision_type: string;
    created_at: string;
    confidence_score: number;
  }>;
}

export function AgentStatusIndicator({ itemId, className = '' }: AgentStatusProps) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgentStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(fetchAgentStatus, 30000);
    return () => clearInterval(interval);
  }, [itemId]);

  const fetchAgentStatus = async () => {
    try {
      const response = await fetch(`/api/agent?itemId=${itemId}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
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

  if (!status?.agentEnabled) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
        <Bot className="h-4 w-4" />
        <span className="text-sm">Agent disabled</span>
      </div>
    );
  }

  const lastDecision = status.recentDecisions[0];
  const getStatusColor = () => {
    if (!lastDecision) return 'text-blue-500';
    
    const decisionAge = Date.now() - new Date(lastDecision.created_at).getTime();
    const hoursOld = decisionAge / (1000 * 60 * 60);
    
    if (hoursOld < 1) return 'text-green-500'; // Active recently
    if (hoursOld < 24) return 'text-blue-500'; // Active today
    return 'text-gray-500'; // Inactive
  };

  const getStatusIcon = () => {
    if (!lastDecision) return Clock;
    
    switch (lastDecision.decision_type) {
      case 'ACCEPT': return CheckCircle;
      case 'COUNTER': return Clock;
      case 'WAIT': return Clock;
      case 'DECLINE': return AlertTriangle;
      default: return Bot;
    }
  };

  const getStatusText = () => {
    if (!lastDecision) return 'Monitoring offers';
    
    const timeAgo = getTimeAgo(lastDecision.created_at);
    
    switch (lastDecision.decision_type) {
      case 'ACCEPT': return `Accepted offer ${timeAgo}`;
      case 'COUNTER': return `Countered ${timeAgo}`;
      case 'WAIT': return `Waiting for offers ${timeAgo}`;
      case 'DECLINE': return `Declined offer ${timeAgo}`;
      default: return `Active ${timeAgo}`;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative">
        <Bot className={`h-4 w-4 ${getStatusColor()}`} />
        <div className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${
          status.recentDecisions.length > 0 ? 'bg-green-400' : 'bg-gray-400'
        } animate-pulse`}></div>
      </div>
      
      <div className="flex flex-col">
        <div className="flex items-center space-x-1">
          <StatusIcon className={`h-3 w-3 ${getStatusColor()}`} />
          <span className="text-sm font-medium text-gray-900">AI Agent</span>
        </div>
        <span className="text-xs text-gray-600">
          {getStatusText()}
        </span>
      </div>
      
      {status.targetPrice && (
        <div className="text-xs text-gray-500">
          Target: ${status.targetPrice}
        </div>
      )}
    </div>
  );
}

// Simple version for compact spaces
export function AgentStatusBadge({ itemId, className = '' }: AgentStatusProps) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/agent?itemId=${itemId}`);
        if (response.ok) {
          const data = await response.json();
          setIsActive(data.agentEnabled && data.recentDecisions.length > 0);
        }
      } catch (error) {
        console.error('Failed to check agent status:', error);
      }
    };

    checkStatus();
  }, [itemId]);

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Bot className={`h-3 w-3 ${isActive ? 'text-green-500' : 'text-gray-400'}`} />
      <span className="text-xs text-gray-600">
        {isActive ? 'Auto' : 'Manual'}
      </span>
    </div>
  );
}