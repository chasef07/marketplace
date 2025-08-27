'use client';

import { useState, useEffect } from 'react';
import { Filter, Download, Eye } from 'lucide-react';

interface Decision {
  id: number;
  seller_id: string;
  negotiation_id: number;
  item_id: number;
  item_name?: string;
  decision_type: 'ACCEPT' | 'COUNTER' | 'WAIT' | 'DECLINE';
  original_offer_price: number;
  recommended_price?: number;
  listing_price: number;
  nash_equilibrium_price?: number;
  confidence_score: number;
  reasoning: string;
  market_conditions: any;
  execution_time_ms: number;
  created_at: string;
  furniture_type: string;
}

interface FilterOptions {
  decision_type?: string;
  furniture_type?: string;
  date_from?: string;
  date_to?: string;
  min_confidence?: number;
}

interface Analytics {
  totalDecisions: number;
  decisionTypeBreakdown: Record<string, number>;
  averageConfidence: number;
  averageExecutionTime: number;
  furnitureTypeBreakdown: Record<string, number>;
  successRate: number;
}

export default function DecisionHistory() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDecisions();
    fetchAnalytics();
  }, [page, filters]);

  const fetchDecisions = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== '') {
            acc[key] = value.toString();
          }
          return acc;
        }, {} as Record<string, string>)
      });

      const response = await fetch(`/api/admin/agent/decisions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDecisions(data.decisions || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch decisions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams(
        Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== '') {
            acc[key] = value.toString();
          }
          return acc;
        }, {} as Record<string, string>)
      );

      const response = await fetch(`/api/admin/agent/analytics?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'ACCEPT': return 'bg-green-100 text-green-800';
      case 'COUNTER': return 'bg-blue-100 text-blue-800';
      case 'DECLINE': return 'bg-red-100 text-red-800';
      case 'WAIT': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Decision History</h1>
          <p className="text-gray-600 mt-1">Analyze agent decision patterns and performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Decisions</div>
            <div className="text-2xl font-bold">{analytics.totalDecisions}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Avg Confidence</div>
            <div className="text-2xl font-bold">{(analytics.averageConfidence * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Success Rate</div>
            <div className="text-2xl font-bold">{(analytics.successRate * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Avg Execution</div>
            <div className="text-2xl font-bold">{Math.round(analytics.averageExecutionTime)}ms</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Most Common</div>
            <div className="text-lg font-bold">
              {Object.entries(analytics.decisionTypeBreakdown)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select
            value={filters.decision_type || ''}
            onChange={(e) => setFilters({...filters, decision_type: e.target.value || undefined})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Decisions</option>
            <option value="ACCEPT">Accept</option>
            <option value="COUNTER">Counter</option>
            <option value="DECLINE">Decline</option>
            <option value="WAIT">Wait</option>
          </select>
          
          <select
            value={filters.furniture_type || ''}
            onChange={(e) => setFilters({...filters, furniture_type: e.target.value || undefined})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            <option value="couch">Couch</option>
            <option value="dining_table">Dining Table</option>
            <option value="bed">Bed</option>
            <option value="chair">Chair</option>
            <option value="desk">Desk</option>
            <option value="other">Other</option>
          </select>
          
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => setFilters({...filters, date_from: e.target.value || undefined})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="From Date"
          />
          
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => setFilters({...filters, date_to: e.target.value || undefined})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="To Date"
          />
          
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={filters.min_confidence || ''}
            onChange={(e) => setFilters({...filters, min_confidence: e.target.value ? parseFloat(e.target.value) : undefined})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Min Confidence"
          />
        </div>
        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => {setFilters({}); setPage(1);}}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
          >
            Clear Filters
          </button>
          <button
            onClick={() => {setPage(1); fetchDecisions(); fetchAnalytics();}}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Decisions Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Decision History</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Decision</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prices</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Execution</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {decisions.map((decision) => (
                <tr key={decision.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(decision.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {decision.item_name || `Item #${decision.item_id}`}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {decision.furniture_type.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getDecisionColor(decision.decision_type)}`}>
                      {decision.decision_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div>Listed: ${decision.listing_price}</div>
                    <div>Offered: ${decision.original_offer_price}</div>
                    {decision.recommended_price && (
                      <div className="text-blue-600">Recommended: ${decision.recommended_price}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-medium ${getConfidenceColor(decision.confidence_score)}`}>
                      {(decision.confidence_score * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {decision.execution_time_ms}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => setSelectedDecision(decision)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Decision Detail Modal */}
      {selectedDecision && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Decision Details</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Decision Type</label>
                  <div className="font-medium">{selectedDecision.decision_type}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Confidence</label>
                  <div className="font-medium">{(selectedDecision.confidence_score * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Original Offer</label>
                  <div className="font-medium">${selectedDecision.original_offer_price}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Listing Price</label>
                  <div className="font-medium">${selectedDecision.listing_price}</div>
                </div>
                {selectedDecision.nash_equilibrium_price && (
                  <div>
                    <label className="text-sm text-gray-600">Nash Equilibrium</label>
                    <div className="font-medium">${selectedDecision.nash_equilibrium_price}</div>
                  </div>
                )}
                {selectedDecision.recommended_price && (
                  <div>
                    <label className="text-sm text-gray-600">Recommended Price</label>
                    <div className="font-medium">${selectedDecision.recommended_price}</div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-600">Reasoning</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                  {selectedDecision.reasoning}
                </div>
              </div>
              
              {selectedDecision.market_conditions && Object.keys(selectedDecision.market_conditions).length > 0 && (
                <div>
                  <label className="text-sm text-gray-600">Market Conditions</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedDecision.market_conditions, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedDecision(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}