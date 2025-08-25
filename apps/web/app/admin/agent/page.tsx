'use client';

import { useState, useEffect } from 'react';
import { Bot, Activity, Clock, CheckCircle, Monitor, TrendingUp } from 'lucide-react';
import { ProgressBar, DecisionDistributionChart } from '@/components/admin/AgentCharts';

interface SystemStats {
  queueStats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  recentDecisions: number;
  status: string;
  lastCheck: string;
}

interface AgentMetrics {
  totalSellers: number;
  activeSellers: number;
  averageConfidence: number;
  successRate: number;
  totalDecisions: number;
  decisionTypeBreakdown?: Record<string, number>;
  furnitureTypeBreakdown?: Record<string, number>;
}

export default function AgentDashboard() {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch system status
      const statusResponse = await fetch('/api/agent/monitor');
      const systemData = await statusResponse.json();
      setSystemStats(systemData);

      // Fetch agent metrics
      const metricsResponse = await fetch('/api/admin/agent/metrics');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setAgentMetrics(metricsData);
      }

      // Fetch enhanced analytics for charts
      const analyticsResponse = await fetch('/api/admin/agent/analytics');
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAgentMetrics(prev => ({ ...prev, ...analyticsData }));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor autonomous seller agent performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-2 ${getStatusColor(systemStats?.status || 'unknown')}`}>
            <Activity className="h-5 w-5" />
            <span className="font-medium capitalize">{systemStats?.status || 'Unknown'}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Queue Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">Processing Queue</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="font-medium">{systemStats?.queueStats.pending || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Processing</span>
              <span className="font-medium">{systemStats?.queueStats.processing || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Completed</span>
              <span className="font-medium text-green-600">{systemStats?.queueStats.completed || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Failed</span>
              <span className="font-medium text-red-600">{systemStats?.queueStats.failed || 0}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{systemStats?.recentDecisions || 0}</div>
            <p className="text-sm text-gray-600">Decisions (last hour)</p>
          </div>
        </div>

        {/* Active Sellers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Bot className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900">Active Agents</h3>
          </div>
          <div className="space-y-2">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{agentMetrics?.activeSellers || 0}</div>
              <p className="text-sm text-gray-600">of {agentMetrics?.totalSellers || 0} sellers</p>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold text-gray-900">Performance</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Success Rate</span>
              <span className="font-medium">{((agentMetrics?.successRate || 0) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Confidence</span>
              <span className="font-medium">{((agentMetrics?.averageConfidence || 0) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Decisions</span>
              <span className="font-medium">{agentMetrics?.totalDecisions || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      {agentMetrics?.decisionTypeBreakdown && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Decision Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Decision Distribution</h3>
            <DecisionDistributionChart 
              decisions={agentMetrics.decisionTypeBreakdown} 
            />
          </div>

          {/* Agent Performance Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <ProgressBar
                label="Success Rate"
                value={Math.round((agentMetrics.successRate || 0) * 100)}
                max={100}
                color="bg-green-500"
              />
              <ProgressBar
                label="Average Confidence"
                value={Math.round((agentMetrics.averageConfidence || 0) * 100)}
                max={100}
                color="bg-blue-500"
              />
              <ProgressBar
                label="Agent Adoption"
                value={agentMetrics.activeSellers || 0}
                max={agentMetrics.totalSellers || 1}
                color="bg-purple-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => fetch('/api/agent/monitor', { method: 'POST' })}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Activity className="h-4 w-4" />
            <span>Force Process Queue</span>
          </button>
          
          <button 
            onClick={() => window.open('/admin/agent/monitor', '_blank')}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Monitor className="h-4 w-4" />
            <span>Open Live Monitor</span>
          </button>
          
          <button 
            onClick={() => fetchDashboardData()}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Activity className="h-4 w-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Last System Check:</span>
            <span className="ml-2 font-medium">
              {systemStats?.lastCheck ? new Date(systemStats.lastCheck).toLocaleString() : 'Unknown'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Queue Processing:</span>
            <span className="ml-2 font-medium">Every 30 seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
}