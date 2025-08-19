'use client';

import { useState } from 'react';
import { Play, Settings, RefreshCw, Target, Lightbulb } from 'lucide-react';

interface TestScenario {
  itemName: string;
  furnitureType: string;
  listingPrice: number;
  offerPrice: number;
  competingOffers: number;
  aggressivenessLevel: number;
  autoAcceptThreshold: number;
  minAcceptableRatio: number;
}

interface TestResult {
  decision: string;
  recommendedPrice?: number;
  confidence: number;
  reasoning: string;
  nashPrice: number;
  marketValue: number;
  executionTime: number;
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
  });

  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setTesting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/agent/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario),
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
  };

  const getOfferRatio = () => {
    return scenario.listingPrice > 0 ? (scenario.offerPrice / scenario.listingPrice) : 0;
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Testing Playground</h1>
        <p className="text-gray-600 mt-1">Simulate negotiation scenarios to test agent behavior</p>
      </div>

      {/* Preset Scenarios */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scenario Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Settings className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Scenario Configuration</h3>
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
          <div className="flex items-center space-x-2 mb-6">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold text-gray-900">Simulation Results</h3>
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
                <h4 className="font-medium text-gray-900 mb-2">Agent Reasoning</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                  {testResult.reasoning}
                </div>
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
            </div>
          ) : (
            <div className="text-center py-12">
              <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Configure a scenario and run simulation to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}