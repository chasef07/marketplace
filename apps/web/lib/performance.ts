// Performance tracking utilities
export function initPerformanceTracking() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    // Initialize performance monitoring
    console.log('Performance tracking initialized')
    
    // Track Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        console.log(`${entry.name}: ${entry.value}`)
      })
    })
    
    try {
      observer.observe({ entryTypes: ['measure', 'navigation'] })
    } catch (e) {
      console.warn('Performance observer not supported', e)
    }
  }
}

export function trackEvent(eventName: string, data?: Record<string, any>) {
  console.log(`Track event: ${eventName}`, data)
}

export function trackPageView(path: string) {
  console.log(`Page view: ${path}`)
}

export default {
  initPerformanceTracking,
  trackEvent,
  trackPageView
}