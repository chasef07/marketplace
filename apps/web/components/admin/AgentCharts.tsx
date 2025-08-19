'use client';

import React from 'react';

interface ChartProps {
  className?: string;
}

// Simple Progress Bar Component
export function ProgressBar({ 
  value, 
  max, 
  label, 
  color = 'bg-blue-500',
  className = '' 
}: { 
  value: number; 
  max: number; 
  label: string; 
  color?: string; 
  className?: string; 
}) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{value}/{max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${color} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Simple Pie Chart Component (using CSS)
export function PieChart({ 
  data, 
  size = 120, 
  className = '' 
}: { 
  data: { label: string; value: number; color: string; }[]; 
  size?: number; 
  className?: string; 
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <div className="text-sm text-gray-500">No data</div>
      </div>
    );
  }

  let currentAngle = 0;
  
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          fill="transparent"
          stroke="#f3f4f6"
          strokeWidth="2"
        />
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const angle = (item.value / total) * 360;
          const radius = size / 2 - 10;
          const circumference = 2 * Math.PI * radius;
          const strokeDasharray = circumference;
          const strokeDashoffset = circumference - (percentage / 100) * circumference;
          
          const element = (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={item.color}
              strokeWidth="16"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              style={{
                transformOrigin: `${size / 2}px ${size / 2}px`,
                transform: `rotate(${currentAngle}deg)`
              }}
            />
          );
          
          currentAngle += angle;
          return element;
        })}
      </svg>
      
      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold">{total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>
    </div>
  );
}

// Simple Bar Chart Component
export function BarChart({ 
  data, 
  height = 200, 
  className = '' 
}: { 
  data: { label: string; value: number; color?: string; }[]; 
  height?: number; 
  className?: string; 
}) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-end space-x-2" style={{ height }}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (height - 20);
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="text-xs font-medium mb-1">{item.value}</div>
              <div
                className={`w-full ${item.color || 'bg-blue-500'} rounded-t transition-all duration-300`}
                style={{ height: Math.max(barHeight, 2) }}
              />
              <div className="text-xs text-gray-600 mt-2 text-center">{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Time Series Line Chart (simplified)
export function LineChart({ 
  data, 
  height = 200, 
  className = '' 
}: { 
  data: { label: string; value: number; }[]; 
  height?: number; 
  className?: string; 
}) {
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-sm text-gray-500">No data available</div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;
  
  return (
    <div className={`relative ${className}`} style={{ height }}>
      <svg width="100%" height={height} className="overflow-visible">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            y1={height - (ratio * height)}
            x2="100%"
            y2={height - (ratio * height)}
            stroke="#f3f4f6"
            strokeWidth="1"
          />
        ))}
        
        {/* Data line */}
        {data.length > 1 && (
          <polyline
            points={data.map((point, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = height - ((point.value - minValue) / range) * height;
              return `${x}%,${y}`;
            }).join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        
        {/* Data points */}
        {data.map((point, index) => {
          const x = (index / Math.max(data.length - 1, 1)) * 100;
          const y = height - ((point.value - minValue) / range) * height;
          
          return (
            <circle
              key={index}
              cx={`${x}%`}
              cy={y}
              r="3"
              fill="#3b82f6"
              stroke="white"
              strokeWidth="2"
            />
          );
        })}
      </svg>
      
      {/* Labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-600">
        {data.map((point, index) => (
          <div key={index} className="text-center" style={{ width: `${100 / data.length}%` }}>
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// Metric Card with Chart
export function MetricCard({ 
  title, 
  value, 
  change, 
  chart, 
  className = '' 
}: { 
  title: string; 
  value: string | number; 
  change?: { value: number; positive: boolean; }; 
  chart?: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        {change && (
          <span className={`text-sm font-medium ${
            change.positive ? 'text-green-600' : 'text-red-600'
          }`}>
            {change.positive ? '+' : ''}{change.value}%
          </span>
        )}
      </div>
      
      <div className="text-3xl font-bold text-gray-900 mb-4">
        {value}
      </div>
      
      {chart && (
        <div className="mt-4">
          {chart}
        </div>
      )}
    </div>
  );
}

// Decision Distribution Donut Chart
export function DecisionDistributionChart({ 
  decisions,
  className = ''
}: {
  decisions: Record<string, number>;
  className?: string;
}) {
  const colors = {
    ACCEPT: '#10b981',
    COUNTER: '#3b82f6', 
    DECLINE: '#ef4444',
    WAIT: '#f59e0b'
  };
  
  const data = Object.entries(decisions).map(([key, value]) => ({
    label: key,
    value,
    color: colors[key as keyof typeof colors] || '#6b7280'
  }));
  
  return (
    <div className={`flex items-center space-x-6 ${className}`}>
      <PieChart data={data} size={120} />
      
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.label} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-gray-600">{item.label}</span>
            <span className="text-sm font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}