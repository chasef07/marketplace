'use client';

import { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface RealtimeUpdatesProps {
  onUpdate?: (data: any) => void;
  interval?: number;
  endpoint: string;
  enabled?: boolean;
}

export default function RealtimeUpdates({ 
  onUpdate, 
  interval = 5000, 
  endpoint, 
  enabled = false 
}: RealtimeUpdatesProps) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUpdate = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setConnected(true);
      setError(null);
      
      if (onUpdate) {
        onUpdate(data);
      }
    } catch (err) {
      setConnected(false);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [endpoint, enabled, onUpdate]);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    // Initial fetch
    fetchUpdate();

    // Set up polling
    const intervalId = setInterval(fetchUpdate, interval);

    return () => clearInterval(intervalId);
  }, [fetchUpdate, interval, enabled]);

  if (!enabled) return null;

  return (
    <div className="flex items-center space-x-2">
      {connected ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500" />
      )}
      <span className="text-xs text-gray-600">
        {connected ? 'Live' : error ? 'Error' : 'Connecting...'}
      </span>
      {error && (
        <span className="text-xs text-red-500" title={error}>
          ⚠
        </span>
      )}
    </div>
  );
}

// Hook for using realtime updates in components
export function useRealtimeUpdates<T>(
  endpoint: string, 
  interval: number = 5000, 
  enabled: boolean = false
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const result = await response.json();
      setData(result);
      setConnected(true);
      setError(null);
    } catch (err) {
      setConnected(false);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [endpoint, enabled]);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      setData(null);
      return;
    }

    // Initial fetch
    fetchData();

    // Set up polling
    const intervalId = setInterval(fetchData, interval);

    return () => clearInterval(intervalId);
  }, [fetchData, interval, enabled]);

  return { data, loading, error, connected, refetch: fetchData };
}