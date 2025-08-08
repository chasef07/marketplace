'use client'

import { useEffect } from 'react';
import { initPerformanceTracking } from '@/lib/performance';

interface PerformanceProviderProps {
  children: React.ReactNode;
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  useEffect(() => {
    // Initialize performance tracking on mount
    initPerformanceTracking();
  }, []);

  return <>{children}</>;
}