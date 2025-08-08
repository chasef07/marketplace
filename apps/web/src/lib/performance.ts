// Performance monitoring utilities

// Web Vitals tracking
export const trackWebVitals = () => {
  if (typeof window === 'undefined') return;

  // Track Core Web Vitals
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const metric = {
        name: entry.name,
        value: entry.value,
        rating: getRating(entry.name, entry.value),
        url: window.location.pathname,
        timestamp: Date.now(),
      };
      
      // Send to analytics (Vercel Analytics will automatically track this)
      console.log('Performance Metric:', metric);
    }
  });

  // Observe Core Web Vitals
  try {
    observer.observe({ entryTypes: ['measure', 'navigation'] });
  } catch (error) {
    console.warn('Performance observer not supported:', error);
  }
};

// Rate performance metrics
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  switch (name) {
    case 'FCP': // First Contentful Paint
      return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
    case 'LCP': // Largest Contentful Paint
      return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    case 'FID': // First Input Delay
      return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
    case 'CLS': // Cumulative Layout Shift
      return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    case 'TTFB': // Time to First Byte
      return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
    default:
      return 'good';
  }
}

// API response time tracking
export const trackAPICall = (endpoint: string, startTime: number) => {
  if (typeof window === 'undefined') return;

  const endTime = performance.now();
  const duration = endTime - startTime;
  
  const metric = {
    type: 'api-call',
    endpoint,
    duration,
    rating: duration <= 500 ? 'good' : duration <= 1000 ? 'needs-improvement' : 'poor',
    timestamp: Date.now(),
    url: window.location.pathname,
  };
  
  // Log for debugging
  console.log('API Call Metric:', metric);
  
  // You can extend this to send to your analytics service
  return metric;
};

// Component render time tracking
export const trackComponentRender = (componentName: string) => {
  if (typeof window === 'undefined') return { start: () => {}, end: () => {} };
  
  let startTime: number;
  
  return {
    start: () => {
      startTime = performance.now();
    },
    end: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const metric = {
        type: 'component-render',
        component: componentName,
        duration,
        rating: duration <= 16 ? 'good' : duration <= 50 ? 'needs-improvement' : 'poor', // 60fps = 16ms
        timestamp: Date.now(),
        url: window.location.pathname,
      };
      
      console.log('Component Render Metric:', metric);
      return metric;
    }
  };
};

// Bundle size analysis (development only)
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV !== 'development') return;
  
  // This would require build-time analysis
  console.log('Bundle analysis should be done at build time with @next/bundle-analyzer');
};

// Memory usage tracking
export const trackMemoryUsage = () => {
  if (typeof window === 'undefined') return;
  
  // Check if performance.memory is available (Chrome only)
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const metric = {
      type: 'memory-usage',
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      timestamp: Date.now(),
      url: window.location.pathname,
    };
    
    console.log('Memory Usage:', metric);
    return metric;
  }
  
  return null;
};

// Initialize performance tracking
export const initPerformanceTracking = () => {
  if (typeof window === 'undefined') return;
  
  // Track initial page load
  window.addEventListener('load', () => {
    trackWebVitals();
    trackMemoryUsage();
  });
  
  // Track memory usage periodically (every 30 seconds)
  setInterval(() => {
    trackMemoryUsage();
  }, 30000);
};