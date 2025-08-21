'use client';

import { useState, useEffect } from 'react';
import { Play, Settings, RefreshCw, Target, Lightbulb, Plus, X, Clock, DollarSign, ChevronDown, ChevronRight, Database } from 'lucide-react';

interface CompetingOffer {
  id: string;
  buyerName: string;
  offerPrice: number;
  hoursAgo: number;
}

interface OfferSimulationResult {
  offerId: string;
  buyerName: string;
  offerPrice: number;
  decision: string;
  recommendedPrice?: number;
  confidence: number;
  reasoning: string;
  nashPrice: number;
  marketValue: number;
  executionTime: number;
  competitiveRanking: number; // 1 = best offer, 2 = second best, etc.
  offerStrength: 'strong' | 'fair' | 'weak';
}

interface TestScenario {
  itemName: string;
  furnitureType: string;
  listingPrice: number;
  offerPrice: number;
  competingOffers: number;
  aggressivenessLevel: number;
  autoAcceptThreshold: number;
  minAcceptableRatio: number;
  multipleOffers: CompetingOffer[];
}

interface TestResult {
  decision: string;
  recommendedPrice?: number;
  confidence: number;
  reasoning: string;
  nashPrice: number;
  marketValue: number;
  executionTime: number;
  individualOfferResults?: OfferSimulationResult[];
  overallStrategy?: string;
}

interface LiveMarketplaceItem {
  id: number;
  name: string;
  starting_price: number;
  furniture_type: string;
  agent_enabled: boolean;
  item_status: string;
  created_at: string;
  seller: {
    username: string;
  };
  negotiationsCount: number;
  offersCount: number;
  highestOffer?: number;
}

const furnitureTypes = [
  { value: 'couch', label: 'Couch' },
  { value: 'dining_table', label: 'Dining Table' },
  { value: 'bed', label: 'Bed' },
  { value: 'chair', label: 'Chair' },
  { value: 'desk', label: 'Desk' },
  { value: 'dresser', label: 'Dresser' },
  { value: 'coffee_table', label: 'Coffee Table' },
  { value: 'nightstand', label: 'Nightstand' },
  { value: 'bookshelf', label: 'Bookshelf' },
  { value: 'cabinet', label: 'Cabinet' },
  { value: 'other', label: 'Other' },
];

const presetScenarios = [
  {
    name: 'Lowball Offer',
    scenario: {
      itemName: 'Vintage Dining Table',
      furnitureType: 'dining_table',
      listingPrice: 500,
      offerPrice: 250,
      competingOffers: 0,
      aggressivenessLevel: 0.5,
      autoAcceptThreshold: 0.95,
      minAcceptableRatio: 0.75,
      multipleOffers: [],
    }
  },
  {
    name: 'Fair Offer',
    scenario: {
      itemName: 'Modern Couch',
      furnitureType: 'couch',
      listingPrice: 800,
      offerPrice: 680,
      competingOffers: 1,
      aggressivenessLevel: 0.5,
      autoAcceptThreshold: 0.95,
      minAcceptableRatio: 0.75,
      multipleOffers: [
        { id: '1', buyerName: 'Buyer 1', offerPrice: 650, hoursAgo: 2 }
      ],
    }
  },
  {
    name: 'Competitive Bidding',
    scenario: {
      itemName: 'Antique Desk',
      furnitureType: 'desk',
      listingPrice: 1200,
      offerPrice: 1000,
      competingOffers: 3,
      aggressivenessLevel: 0.7,
      autoAcceptThreshold: 0.95,
      minAcceptableRatio: 0.75,
      multipleOffers: [
        { id: '1', buyerName: 'Buyer 1', offerPrice: 1000, hoursAgo: 1 },
        { id: '2', buyerName: 'Buyer 2', offerPrice: 950, hoursAgo: 6 },
        { id: '3', buyerName: 'Buyer 3', offerPrice: 1100, hoursAgo: 3 }
      ],
    }
  },
  {
    name: 'Quick Sale (Aggressive)',
    scenario: {
      itemName: 'Used Chair',
      furnitureType: 'chair',
      listingPrice: 150,
      offerPrice: 120,
      competingOffers: 0,
      aggressivenessLevel: 0.2,
      autoAcceptThreshold: 0.85,
      minAcceptableRatio: 0.65,
      multipleOffers: [],
    }
  },
  {
    name: 'Multiple Competing Offers',
    scenario: {
      itemName: 'Designer Couch',
      furnitureType: 'couch',
      listingPrice: 900,
      offerPrice: 405,
      competingOffers: 5,
      aggressivenessLevel: 0.6,
      autoAcceptThreshold: 0.95,
      minAcceptableRatio: 0.75,
      multipleOffers: [
        { id: '1', buyerName: 'Buyer 1', offerPrice: 400, hoursAgo: 4 },
        { id: '2', buyerName: 'Buyer 2', offerPrice: 250, hoursAgo: 24 },
        { id: '3', buyerName: 'Buyer 3', offerPrice: 405, hoursAgo: 5 },
        { id: '4', buyerName: 'Buyer 4', offerPrice: 380, hoursAgo: 12 },
        { id: '5', buyerName: 'Buyer 5', offerPrice: 420, hoursAgo: 2 }
      ],
    }
  },
];

export default function TestingPlayground() {
  const [scenario, setScenario] = useState<TestScenario>({
    itemName: 'Test Item',
    furnitureType: 'couch',
    listingPrice: 500,
    offerPrice: 400,
    competingOffers: 0,
    aggressivenessLevel: 0.5,
    autoAcceptThreshold: 0.95,
    minAcceptableRatio: 0.75,
    multipleOffers: [],
  });

  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newOfferBuyer, setNewOfferBuyer] = useState('');
  const [newOfferPrice, setNewOfferPrice] = useState('');
  const [newOfferHours, setNewOfferHours] = useState('');
  const [expandedOffers, setExpandedOffers] = useState<Set<string>>(new Set());
  
  // Live marketplace data
  const [liveItems, setLiveItems] = useState<LiveMarketplaceItem[]>([]);
  const [loadingLiveData, setLoadingLiveData] = useState(false);
  const [selectedLiveItem, setSelectedLiveItem] = useState<LiveMarketplaceItem | null>(null);
  const [testMode, setTestMode] = useState<'simulation' | 'live'>('simulation');
  const [creatingTestScenario, setCreatingTestScenario] = useState(false);

  // Load live marketplace data
  useEffect(() => {
    if (testMode === 'live') {
      loadLiveMarketplaceData();
    }
  }, [testMode]);

  const loadLiveMarketplaceData = async () => {
    try {
      setLoadingLiveData(true);
      const response = await fetch('/api/items?limit=20');
      if (response.ok) {
        const data = await response.json();
        const processedItems = data.items?.map((item: any) => ({
          ...item,
          negotiationsCount: 0, // Would need to be calculated from actual data
          offersCount: 0,
          highestOffer: undefined
        })) || [];
        setLiveItems(processedItems);
      }
    } catch (error) {
      console.error('Error loading live marketplace data:', error);
    } finally {
      setLoadingLiveData(false);
    }
  };

  const selectLiveItem = (item: LiveMarketplaceItem) => {
    setSelectedLiveItem(item);
    // Update scenario with live item data
    setScenario(prev => ({
      ...prev,
      itemName: item.name,
      furnitureType: item.furniture_type,
      listingPrice: item.starting_price,
      offerPrice: Math.round(item.starting_price * 0.8), // Default to 80% of listing price
    }));
  };

  const createMultiBuyerTestScenario = async () => {
    if (!selectedLiveItem || !selectedLiveItem.agent_enabled) {
      alert('Please select a live item with AI agent enabled');
      return;
    }

    try {
      setCreatingTestScenario(true);
      
      const response = await fetch('/api/admin/test/multi-buyer-scenario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: selectedLiveItem.id,
          numBuyers: 3,
          baseOfferAmount: Math.round(selectedLiveItem.starting_price * 0.8)
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Test scenario created successfully!\n\n${result.message}\n\nNext: Call the agent monitor to see live responses.`);
        
        // Trigger agent processing
        setTimeout(async () => {
          try {
            const monitorResponse = await fetch('/api/agent/monitor', { method: 'POST' });
            if (monitorResponse.ok) {
              const monitorResult = await monitorResponse.json();
              console.log('Agent processing result:', monitorResult);
            }
          } catch (error) {
            console.error('Error triggering agent monitor:', error);
          }
        }, 1000);
        
      } else {
        const errorData = await response.json();
        alert(`❌ Failed to create test scenario: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error creating test scenario:', error);
      alert('❌ Error creating test scenario. Check console for details.');
    } finally {
      setCreatingTestScenario(false);
    }
  };

  const runSimulation = async () => {
    setTesting(true);
    setError(null);
    setExpandedOffers(new Set()); // Reset expanded state for new simulation
    
    try {
      const response = await fetch('/api/admin/agent/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scenario,
          competingOffers: scenario.multipleOffers.length,
          multipleOffersData: scenario.multipleOffers
        }),
      });

      if (!response.ok) {
        throw new Error('Simulation failed');
      }

      const result = await response.json();
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setTesting(false);
    }
  };

  const loadPreset = (preset: typeof presetScenarios[0]) => {
    setScenario(preset.scenario);
    setTestResult(null);
    setError(null);
    setExpandedOffers(new Set()); // Reset expanded state
  };

  const addOffer = () => {
    if (!newOfferBuyer || !newOfferPrice || !newOfferHours) return;
    
    const newOffer: CompetingOffer = {
      id: Date.now().toString(),
      buyerName: newOfferBuyer,
      offerPrice: parseFloat(newOfferPrice),
      hoursAgo: parseInt(newOfferHours)
    };

    setScenario({
      ...scenario,
      multipleOffers: [...scenario.multipleOffers, newOffer],
      competingOffers: scenario.multipleOffers.length + 1
    });

    setNewOfferBuyer('');
    setNewOfferPrice('');
    setNewOfferHours('');
  };

  const removeOffer = (id: string) => {
    const updatedOffers = scenario.multipleOffers.filter(offer => offer.id !== id);
    setScenario({
      ...scenario,
      multipleOffers: updatedOffers,
      competingOffers: updatedOffers.length
    });
  };

  const getOfferRatio = () => {
    return scenario.listingPrice > 0 ? (scenario.offerPrice / scenario.listingPrice) : 0;
  };

  const getSortedOffers = () => {
    return [...scenario.multipleOffers].sort((a, b) => {
      // Sort by price (highest first), then by time (most recent first)
      if (b.offerPrice !== a.offerPrice) {
        return b.offerPrice - a.offerPrice;
      }
      return a.hoursAgo - b.hoursAgo;
    });
  };

  const getHighestOffer = () => {
    if (scenario.multipleOffers.length === 0) return null;
    return scenario.multipleOffers.reduce((highest, current) => 
      current.offerPrice > highest.offerPrice ? current : highest
    );
  };

  const getMostRecentOffer = () => {
    if (scenario.multipleOffers.length === 0) return null;
    return scenario.multipleOffers.reduce((mostRecent, current) => 
      current.hoursAgo < mostRecent.hoursAgo ? current : mostRecent
    );
  };

  const formatTimeAgo = (hoursAgo: number) => {
    if (hoursAgo < 1) return 'Less than 1 hour ago';
    if (hoursAgo === 1) return '1 hour ago';
    if (hoursAgo < 24) return `${hoursAgo} hours ago`;
    const days = Math.floor(hoursAgo / 24);
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  const toggleOfferExpansion = (offerId: string) => {
    const newExpanded = new Set(expandedOffers);
    if (newExpanded.has(offerId)) {
      newExpanded.delete(offerId);
    } else {
      newExpanded.add(offerId);
    }
    setExpandedOffers(newExpanded);
  };

  const getIndividualResult = (offerId: string): OfferSimulationResult | null => {
    return testResult?.individualOfferResults?.find(result => result.offerId === offerId) || null;
  };

  const getOfferStrengthColor = (strength: 'strong' | 'fair' | 'weak') => {
    switch (strength) {
      case 'strong': return 'text-green-600 bg-green-50 border-green-200';
      case 'fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'weak': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'ACCEPT': return 'text-green-600 bg-green-50';
      case 'COUNTER': return 'text-blue-600 bg-blue-50';
      case 'DECLINE': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Testing Playground</h1>
          <p className="text-gray-600 mt-1">Simulate negotiation scenarios to test agent behavior</p>
        </div>
        
        {/* Test Mode Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTestMode('simulation')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              testMode === 'simulation'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Simulation
          </button>
          <button
            onClick={() => setTestMode('live')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
              testMode === 'live'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Database className="w-4 h-4 mr-2" />
            Live Data
          </button>
        </div>
      </div>

      {/* Live Marketplace Items */}
      {testMode === 'live' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">Live Marketplace Items</h3>
            </div>
            <div className="flex items-center space-x-2">
              {selectedLiveItem && selectedLiveItem.agent_enabled && (
                <button
                  onClick={createMultiBuyerTestScenario}
                  disabled={creatingTestScenario}
                  className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  <Plus className={`h-4 w-4 mr-1 ${creatingTestScenario ? 'animate-spin' : ''}`} />
                  {creatingTestScenario ? 'Creating...' : 'Create Multi-Buyer Test'}
                </button>
              )}
              <button
                onClick={loadLiveMarketplaceData}
                disabled={loadingLiveData}
                className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loadingLiveData ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
          
          {loadingLiveData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => selectLiveItem(item)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedLiveItem?.id === item.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-2">{item.name}</h4>
                    {item.agent_enabled && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex-shrink-0 ml-2">
                        🤖 Agent
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Price:</span>
                      <span className="font-medium">${item.starting_price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="capitalize">{item.furniture_type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Seller:</span>
                      <span>{item.seller.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`capitalize ${
                        item.item_status === 'active' ? 'text-green-600' :
                        item.item_status === 'under_negotiation' ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {item.item_status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {liveItems.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No live marketplace items found</p>
                  <p className="text-sm">Try refreshing or switch to simulation mode</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preset Scenarios */}
      {testMode === 'simulation' && (
        <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Target className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">Preset Scenarios</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {presetScenarios.map((preset) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset)}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="font-medium text-gray-900">{preset.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                ${preset.scenario.offerPrice} on ${preset.scenario.listingPrice}
              </div>
              <div className="text-sm text-gray-500">
                {Math.round((preset.scenario.offerPrice / preset.scenario.listingPrice) * 100)}% of asking
              </div>
            </button>
          ))}
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scenario Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Scenario Configuration</h3>
            </div>
            {testMode === 'live' && selectedLiveItem && (
              <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                <Database className="w-4 h-4 mr-1" />
                Live Item #{selectedLiveItem.id}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Item Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
              <input
                type="text"
                value={scenario.itemName}
                onChange={(e) => setScenario({...scenario, itemName: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g., Vintage Dining Table"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Furniture Type</label>
              <select
                value={scenario.furnitureType}
                onChange={(e) => setScenario({...scenario, furnitureType: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {furnitureTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Listing Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={scenario.listingPrice}
                    onChange={(e) => setScenario({...scenario, listingPrice: parseFloat(e.target.value) || 0})}
                    className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Offer Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={scenario.offerPrice}
                    onChange={(e) => setScenario({...scenario, offerPrice: parseFloat(e.target.value) || 0})}
                    className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Offer Ratio</div>
              <div className="text-lg font-bold">
                {(getOfferRatio() * 100).toFixed(1)}% of listing price
              </div>
            </div>

            {/* Market Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Competing Offers</label>
              <input
                type="number"
                value={scenario.competingOffers}
                onChange={(e) => setScenario({...scenario, competingOffers: parseInt(e.target.value) || 0})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                min="0"
                max="10"
              />
            </div>

            {/* Agent Settings */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Agent Settings</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aggressiveness Level: {scenario.aggressivenessLevel}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={scenario.aggressivenessLevel}
                  onChange={(e) => setScenario({...scenario, aggressivenessLevel: parseFloat(e.target.value)})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Conservative</span>
                  <span>Aggressive</span>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auto Accept Threshold: {(scenario.autoAcceptThreshold * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.8"
                  max="1"
                  step="0.01"
                  value={scenario.autoAcceptThreshold}
                  onChange={(e) => setScenario({...scenario, autoAcceptThreshold: parseFloat(e.target.value)})}
                  className="w-full"
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Acceptable Ratio: {(scenario.minAcceptableRatio * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.9"
                  step="0.01"
                  value={scenario.minAcceptableRatio}
                  onChange={(e) => setScenario({...scenario, minAcceptableRatio: parseFloat(e.target.value)})}
                  className="w-full"
                />
              </div>
            </div>

            <button
              onClick={runSimulation}
              disabled={testing}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {testing ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              <span>{testing ? 'Running Simulation...' : 'Run Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold text-gray-900">
                {scenario.multipleOffers.length > 0 ? 'Strategic Overview' : 'Simulation Results'}
              </h3>
            </div>
            {scenario.multipleOffers.length > 0 && (
              <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                Competitive analysis • {scenario.multipleOffers.length} offers
              </span>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="text-red-800">{error}</div>
            </div>
          )}

          {testResult ? (
            <div className="space-y-6">
              {/* Decision Summary */}
              <div className={`p-4 rounded-lg border ${getDecisionColor(testResult.decision)}`}>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold">Decision: {testResult.decision}</div>
                  <div className="text-sm">Confidence: {(testResult.confidence * 100).toFixed(1)}%</div>
                </div>
                {testResult.recommendedPrice && (
                  <div className="mt-2 text-lg">
                    Recommended Price: <span className="font-bold">${testResult.recommendedPrice}</span>
                  </div>
                )}
              </div>

              {/* Detailed Analysis */}
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Nash Equilibrium Price</div>
                  <div className="text-xl font-bold">${testResult.nashPrice}</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Market Value</div>
                  <div className="text-xl font-bold">${testResult.marketValue}</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Execution Time</div>
                  <div className="text-xl font-bold">{testResult.executionTime}ms</div>
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  {scenario.multipleOffers.length > 0 ? 'Strategic Analysis' : 'Agent Reasoning'}
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                  {testResult.reasoning}
                </div>
                {scenario.multipleOffers.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    📊 Strategic overview considering all {scenario.multipleOffers.length} competing offers • See individual tactics below
                  </div>
                )}
              </div>

              {/* Price Analysis */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Price Analysis</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Original Offer</span>
                    <span className="font-medium">${scenario.offerPrice} ({(getOfferRatio() * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Listing Price</span>
                    <span className="font-medium">${scenario.listingPrice}</span>
                  </div>
                  {testResult.recommendedPrice && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Agent Recommendation</span>
                      <span className="font-medium">${testResult.recommendedPrice} ({((testResult.recommendedPrice / scenario.listingPrice) * 100).toFixed(1)}%)</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nash Equilibrium</span>
                    <span className="font-medium">${testResult.nashPrice} ({((testResult.nashPrice / scenario.listingPrice) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              </div>

              {/* Overall Strategy for Multiple Offers */}
              {testResult.overallStrategy && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Overall Strategy</h4>
                  <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                    <div className="text-sm text-indigo-800">
                      {testResult.overallStrategy}
                    </div>
                  </div>
                </div>
              )}

              {/* Multiple Offers Summary */}
              {testResult.individualOfferResults && testResult.individualOfferResults.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Individual Decision Summary</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-800">
                        {testResult.individualOfferResults.filter(r => r.decision === 'ACCEPT').length}
                      </div>
                      <div className="text-sm text-green-600">ACCEPT</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-800">
                        {testResult.individualOfferResults.filter(r => r.decision === 'COUNTER').length}
                      </div>
                      <div className="text-sm text-blue-600">COUNTER</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-800">
                        {testResult.individualOfferResults.filter(r => r.decision === 'DECLINE').length}
                      </div>
                      <div className="text-sm text-red-600">DECLINE</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Configure a scenario and run simulation to see results</p>
            </div>
          )}
        </div>
      </div>

      {/* Multiple Competing Offers Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-6">
          <DollarSign className="h-5 w-5 text-green-500" />
          <h3 className="font-semibold text-gray-900">Multiple Competing Offers</h3>
          <span className="text-sm text-gray-500">({scenario.multipleOffers.length}/5 offers)</span>
        </div>

        {/* Add New Offer Form */}
        <div className="bg-gray-50 p-5 rounded-lg mb-6 border">
          <h4 className="font-medium text-gray-900 mb-3">Add New Offer</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
              <input
                type="text"
                value={newOfferBuyer}
                onChange={(e) => setNewOfferBuyer(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g., Buyer 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Offer Price</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={newOfferPrice}
                  onChange={(e) => setNewOfferPrice(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm"
                  placeholder="400"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours Ago</label>
              <input
                type="number"
                value={newOfferHours}
                onChange={(e) => setNewOfferHours(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="4"
                min="0"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addOffer}
                disabled={!newOfferBuyer || !newOfferPrice || !newOfferHours || scenario.multipleOffers.length >= 5}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                <span>Add Offer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Offers Display */}
        {scenario.multipleOffers.length > 0 ? (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600">Highest Offer</div>
                <div className="text-xl font-bold text-blue-900">
                  ${getHighestOffer()?.offerPrice || 0}
                </div>
                <div className="text-sm text-blue-600">
                  {getHighestOffer()?.buyerName}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600">Most Recent</div>
                <div className="text-xl font-bold text-purple-900">
                  ${getMostRecentOffer()?.offerPrice || 0}
                </div>
                <div className="text-sm text-purple-600">
                  {formatTimeAgo(getMostRecentOffer()?.hoursAgo || 0)}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600">Average Offer</div>
                <div className="text-xl font-bold text-green-900">
                  ${Math.round(scenario.multipleOffers.reduce((sum, offer) => sum + offer.offerPrice, 0) / scenario.multipleOffers.length)}
                </div>
                <div className="text-sm text-green-600">
                  {((scenario.multipleOffers.reduce((sum, offer) => sum + offer.offerPrice, 0) / scenario.multipleOffers.length / scenario.listingPrice) * 100).toFixed(1)}% of listing
                </div>
              </div>
            </div>

            {/* Individual Offers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Individual Buyer Analysis</h4>
                {testResult?.individualOfferResults ? (
                  <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Detailed per-buyer reasoning • Click cards for analysis
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">Run simulation to see individual analysis</span>
                )}
              </div>
              {testResult?.individualOfferResults && (
                <div className="text-sm text-gray-600 mb-4">
                  Each buyer gets separate detailed analysis. These may have different recommendations than the strategic overview above.
                </div>
              )}
              
              {getSortedOffers().map((offer, index) => {
                const isHighest = offer.id === getHighestOffer()?.id;
                const isMostRecent = offer.id === getMostRecentOffer()?.id;
                const offerRatio = (offer.offerPrice / scenario.listingPrice) * 100;
                const isExpanded = expandedOffers.has(offer.id);
                const individualResult = getIndividualResult(offer.id);

                return (
                  <div 
                    key={offer.id}
                    className={`border rounded-lg transition-all duration-200 ${
                      isHighest ? 'border-blue-300 bg-blue-50' : 
                      isMostRecent ? 'border-purple-300 bg-purple-50' : 
                      'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    {/* Main Offer Card */}
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleOfferExpansion(offer.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <div className="font-medium text-gray-900">{offer.buyerName}</div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>{formatTimeAgo(offer.hoursAgo)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">${offer.offerPrice}</div>
                            <div className="text-sm text-gray-600">
                              {offerRatio.toFixed(1)}% of listing
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Badges */}
                          <div className="flex items-center space-x-1">
                            {isHighest && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Highest
                              </span>
                            )}
                            {isMostRecent && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                Most Recent
                              </span>
                            )}
                            {individualResult && (
                              <span className={`px-2 py-1 text-xs rounded-full border ${getOfferStrengthColor(individualResult.offerStrength)}`}>
                                {individualResult.offerStrength}
                              </span>
                            )}
                            {individualResult && (
                              <span className={`px-2 py-1 text-xs rounded-full ${getDecisionColor(individualResult.decision)}`}>
                                {individualResult.decision}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            {/* Expand/Collapse Button */}
                            {individualResult && (
                              <div className="text-gray-400">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </div>
                            )}
                            
                            {/* Remove Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeOffer(offer.id);
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Individual Analysis */}
                    {isExpanded && individualResult && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="space-y-4">
                          {/* Decision Summary */}
                          <div className={`p-3 rounded-lg border ${getDecisionColor(individualResult.decision)}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-lg font-bold">Agent Decision: {individualResult.decision}</div>
                              <div className="text-sm">Confidence: {(individualResult.confidence * 100).toFixed(1)}%</div>
                            </div>
                            {individualResult.recommendedPrice && (
                              <div className="text-base">
                                Recommended Price: <span className="font-bold">${individualResult.recommendedPrice}</span>
                              </div>
                            )}
                            <div className="text-sm mt-1">
                              Competitive Ranking: #{individualResult.competitiveRanking} of {scenario.multipleOffers.length}
                            </div>
                          </div>

                          {/* Analysis Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-white p-3 rounded-lg border">
                              <div className="text-xs text-gray-600">Nash Equilibrium</div>
                              <div className="text-lg font-bold">${individualResult.nashPrice}</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border">
                              <div className="text-xs text-gray-600">Market Value</div>
                              <div className="text-lg font-bold">${individualResult.marketValue}</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border">
                              <div className="text-xs text-gray-600">Analysis Time</div>
                              <div className="text-lg font-bold">{individualResult.executionTime}ms</div>
                            </div>
                          </div>

                          {/* Agent Reasoning */}
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Agent Reasoning for {offer.buyerName}</h5>
                            <div className="bg-white p-3 rounded-lg border text-sm text-gray-700">
                              {individualResult.reasoning}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* No Analysis Available */}
                    {isExpanded && !individualResult && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="text-center py-4 text-gray-500">
                          <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Run simulation to see agent analysis for this offer</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No competing offers yet. Add some offers to simulate competitive bidding.</p>
          </div>
        )}
      </div>
    </div>
  );
}