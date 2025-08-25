'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, AlertCircle, CheckCircle, Clock, Zap, Wifi } from 'lucide-react';

interface QueueItem {
  queue_id: number;
  negotiation_id: number;
  offer_id: number;
  seller_id: string;
  item_id: number;
  item_name: string;
  listing_price: number;
  offer_price: number;
  furniture_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  priority: number;
}

interface ProcessingResult {
  success: boolean;
  processed: number;
  task?: {
    negotiationId: number;
    itemId: number;
    decision: string;
    confidence: number;
    reasoning: string;
    actionResult: {
      success: boolean;
      action: string;
      price?: number;
      error?: string;
    };
    executionTimeMs: number;
  };
  error?: string;
}

export default function LiveMonitor() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastResult, setLastResult] = useState<ProcessingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchQueue();
    
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchQueue, 3000); // Refresh every 3 seconds when live
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh]);

  const fetchQueue = async () => {
    try {
      const response = await fetch('/api/admin/agent/queue');
      if (response.ok) {
        const data = await response.json();
        setQueue(data.queue || []);
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const processNextItem = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/agent/monitor', { method: 'POST' });
      const result = await response.json();
      setLastResult(result);
      
      // Refresh queue after processing
      setTimeout(fetchQueue, 1000);
    } catch (error) {
      console.error('Processing failed:', error);
      setLastResult({
        success: false,
        processed: 0,
        error: 'Processing failed'
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span>Loading live monitor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Agent Monitor</h1>
          <p className="text-gray-600 mt-1">Real-time processing queue and agent decisions</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              autoRefresh 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{autoRefresh ? 'Live' : 'Auto Refresh'}</span>
            {autoRefresh && <Wifi className="h-3 w-3" />}
          </button>
          
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={processNextItem}
            disabled={processing || queue.filter(q => q.status === 'pending').length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            <span>{processing ? 'Processing...' : 'Process Next'}</span>
          </button>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-4 gap-4">
        {['pending', 'processing', 'completed', 'failed'].map(status => (
          <div key={status} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 capitalize">{status}</p>
                <p className="text-2xl font-bold">{queue.filter(q => q.status === status).length}</p>
              </div>
              {getStatusIcon(status)}
            </div>
          </div>
        ))}
      </div>

      {/* Last Processing Result */}
      {lastResult && (
        <div className={`rounded-lg p-4 ${lastResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h3 className="font-semibold mb-2">Last Processing Result</h3>
          {lastResult.success && lastResult.task ? (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-gray-600">Decision:</span>
                  <span className="ml-2 font-medium">{lastResult.task.decision}</span>
                </div>
                <div>
                  <span className="text-gray-600">Confidence:</span>
                  <span className="ml-2 font-medium">{(lastResult.task.confidence * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Action:</span>
                  <span className="ml-2 font-medium">{lastResult.task.actionResult.action}</span>
                </div>
                <div>
                  <span className="text-gray-600">Execution:</span>
                  <span className="ml-2 font-medium">{lastResult.task.executionTimeMs}ms</span>
                </div>
              </div>
              {lastResult.task.actionResult.price && (
                <div>
                  <span className="text-gray-600">Price:</span>
                  <span className="ml-2 font-medium">${lastResult.task.actionResult.price}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600">Reasoning:</span>
                <p className="mt-1 text-gray-800">{lastResult.task.reasoning}</p>
              </div>
            </div>
          ) : lastResult.processed === 0 ? (
            <p className="text-gray-600">No pending tasks to process</p>
          ) : (
            <p className="text-red-600">{lastResult.error || 'Processing failed'}</p>
          )}
        </div>
      )}

      {/* Processing Queue */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Processing Queue</h3>
          <p className="text-sm text-gray-600 mt-1">
            {queue.length} total items • {queue.filter(q => q.status === 'pending').length} pending
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prices</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {queue.map((item) => (
                <tr key={item.queue_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.status)}
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.item_name || `Item #${item.item_id}`}</div>
                    <div className="text-sm text-gray-500">Negotiation #{item.negotiation_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Listed: ${item.listing_price}</div>
                    <div className="text-sm text-gray-500">Offered: ${item.offer_price}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {item.furniture_type.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.priority === 1 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.priority === 1 ? 'High' : 'Normal'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {queue.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No items in processing queue</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}