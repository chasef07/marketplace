# Performance Optimization Plan for Next.js 15 Furniture Marketplace

## Executive Summary

After analyzing the codebase, I've identified multiple performance optimization opportunities across bundle size, React rendering, API performance, database queries, image optimization, and AI integration. The application shows good foundational architecture but has several areas for improvement that could significantly enhance user experience and reduce resource costs.

**Current Status:**
- Bundle Size: **189kB First Load JS** (acceptable but can be optimized)
- Build Performance: **2000ms compilation** (good with Turbopack)
- Multiple ESLint warnings indicating potential performance issues
- Good caching foundation with room for enhancement

---

## 1. Bundle Size & Code Splitting Analysis

### Current State
- **First Load JS: 189kB** - Within acceptable range but can be optimized
- **Largest chunk: 54.1kB** (`chunks/4bd1b696`)
- **Dynamic imports**: Some components already use dynamic imports

### Optimization Strategies

#### High Priority
1. **Reduce Main Bundle Size**
   ```typescript
   // Move large dependencies to dynamic imports
   const Leaflet = dynamic(() => import('leaflet'), { ssr: false })
   const FramerMotion = dynamic(() => import('framer-motion'), { ssr: false })
   ```

2. **Optimize Package Imports**
   ```typescript
   // Current: Import entire libraries
   import { Card, CardContent } from "@/components/ui/card"
   
   // Optimized: Tree-shake unused components
   // Already good practice - maintain this pattern
   ```

3. **Bundle Analysis Setup**
   ```bash
   npm install --save-dev @next/bundle-analyzer
   ```

#### Medium Priority
4. **Split Large Components**
   - `HomePage.tsx` (420 lines) should be split into smaller components
   - `marketplace.tsx` should extract filtering logic to separate hooks
   - `item-detail.tsx` needs component splitting

5. **Lazy Load Heavy Features**
   ```typescript
   // AI features only when needed
   const AIAnalysis = dynamic(() => import('./ai-analysis'), {
     loading: () => <AnalysisLoading />
   })
   ```

---

## 2. Image Optimization Strategy

### Current State
- ✅ Using Next.js Image component
- ✅ WebP/AVIF format support configured
- ✅ Supabase Storage integration
- ❌ No image size optimization
- ❌ No progressive loading strategy

### Optimization Plan

#### High Priority
1. **Implement Image Size Variants**
   ```typescript
   // Add multiple image sizes in Supabase Storage
   const imageSizes = {
     thumbnail: { width: 150, height: 150 },
     card: { width: 300, height: 300 },
     detail: { width: 800, height: 600 },
     original: { width: 1200, height: 900 }
   }
   ```

2. **Add Blur Placeholders**
   ```typescript
   // Expand blur-data.ts with dynamic blur generation
   export const generateBlurDataURL = (width: number, height: number) => {
     return `data:image/svg+xml;base64,...`
   }
   ```

3. **Optimize Upload Process**
   ```typescript
   // Compress images before upload
   const compressImage = async (file: File) => {
     // Use canvas or sharp-like library to compress
     // Generate multiple sizes on upload
   }
   ```

#### Medium Priority
4. **Progressive Loading**
   - Implement skeleton loaders for image grids
   - Use intersection observer for lazy loading
   - Add priority hints for above-fold images

5. **CDN Optimization**
   - Configure Supabase Storage CDN settings
   - Add cache headers for images
   - Implement responsive images with srcSet

---

## 3. React Component Performance

### Issues Identified
1. **HomePage.tsx**: Large component with multiple re-render triggers
2. **Missing dependency arrays** in useEffect hooks
3. **Unnecessary re-renders** due to object/function recreation
4. **No memoization** for expensive calculations

### Optimization Implementation

#### High Priority Fixes
1. **Fix useEffect Dependencies**
   ```typescript
   // Current issues in multiple files:
   useEffect(() => {
     fetchItem()
   }, []) // Missing fetchItem dependency
   
   // Fix:
   const fetchItem = useCallback(async () => {
     // fetch logic
   }, [itemId])
   
   useEffect(() => {
     fetchItem()
   }, [fetchItem])
   ```

2. **Implement React.memo and useMemo**
   ```typescript
   // For expensive filtering operations
   const filteredItems = useMemo(() => {
     return items.filter(item => 
       item.name.toLowerCase().includes(searchQuery.toLowerCase())
     )
   }, [items, searchQuery])
   
   // For components that re-render frequently
   const ItemCard = React.memo(({ item, onItemClick }) => {
     // component logic
   })
   ```

3. **Split HomePage Component**
   ```typescript
   // Break down 420-line component into:
   - AuthStateManager
   - NavigationManager  
   - ViewRenderer
   - DataManager
   ```

#### Medium Priority
4. **Optimize State Management**
   ```typescript
   // Reduce state updates with useReducer for complex state
   const [state, dispatch] = useReducer(appReducer, initialState)
   ```

5. **Implement Virtual Scrolling**
   ```typescript
   // For large item lists in marketplace
   import { FixedSizeList as List } from 'react-window'
   ```

---

## 4. API Performance Optimization

### Current Performance Issues
1. **No request caching** beyond basic headers
2. **N+1 query potential** in nested data fetching
3. **Large response payloads** without pagination optimization
4. **Missing request deduplication**

### Optimization Strategy

#### High Priority
1. **Implement Request Deduplication**
   ```typescript
   // Enhance SWR configuration
   const swrConfig = {
     dedupingInterval: 2000,
     revalidateOnFocus: false,
     revalidateIfStale: false,
     revalidateOnReconnect: true
   }
   ```

2. **Optimize Database Queries**
   ```sql
   -- Add missing indexes (create migration)
   CREATE INDEX CONCURRENTLY idx_items_status_created 
   ON items(item_status, created_at DESC);
   
   CREATE INDEX CONCURRENTLY idx_items_seller_status 
   ON items(seller_id, item_status);
   
   CREATE INDEX CONCURRENTLY idx_negotiations_buyer_status 
   ON negotiations(buyer_id, status);
   ```

3. **Implement Response Caching**
   ```typescript
   // Add Redis caching for expensive queries
   const getCachedItems = async (page: number) => {
     const cacheKey = `items:page:${page}`
     const cached = await redis.get(cacheKey)
     if (cached) return JSON.parse(cached)
     
     const items = await fetchItems(page)
     await redis.setex(cacheKey, 300, JSON.stringify(items)) // 5min cache
     return items
   }
   ```

#### Medium Priority
4. **Optimize Payload Size**
   ```typescript
   // Implement field selection
   const { data } = await supabase
     .from('items')
     .select('id, name, starting_price, images, created_at, seller:profiles(username)')
     .eq('item_status', 'active')
   ```

5. **Add Request Batching**
   ```typescript
   // Batch multiple API calls
   const [items, negotiations, profile] = await Promise.all([
     fetchItems(),
     fetchNegotiations(),
     fetchProfile()
   ])
   ```

---

## 5. Database Query Optimization

### Current Issues
1. **Missing performance indexes** for common query patterns
2. **Inefficient JOIN operations** without proper optimization
3. **No query result caching** at database level

### Optimization Plan

#### High Priority Database Indexes
```sql
-- Items table optimization
CREATE INDEX CONCURRENTLY idx_items_composite_perf 
ON items(item_status, created_at DESC, seller_id);

CREATE INDEX CONCURRENTLY idx_items_search 
ON items USING GIN(to_tsvector('english', name || ' ' || description));

-- Negotiations optimization  
CREATE INDEX CONCURRENTLY idx_negotiations_active 
ON negotiations(status, updated_at DESC) 
WHERE status = 'active';

-- Offers optimization
CREATE INDEX CONCURRENTLY idx_offers_negotiation_time 
ON offers(negotiation_id, created_at DESC);
```

#### Query Optimization
1. **Implement Query Result Caching**
   ```typescript
   // Cache expensive aggregation queries
   const getCachedStats = async () => {
     return await supabase
       .rpc('get_marketplace_stats') // Use stored procedure
   }
   ```

2. **Optimize Pagination**
   ```sql
   -- Use cursor-based pagination for better performance
   SELECT * FROM items 
   WHERE created_at < $1 AND item_status = 'active'
   ORDER BY created_at DESC 
   LIMIT 12;
   ```

---

## 6. Caching Strategy Enhancement

### Current State
- ✅ Basic HTTP caching headers
- ✅ SWR client-side caching
- ❌ No Redis caching layer
- ❌ No CDN optimization strategy

### Comprehensive Caching Implementation

#### High Priority
1. **Multi-Layer Caching Architecture**
   ```typescript
   // Browser → CDN → Redis → Database
   const cacheStrategy = {
     static: 'max-age=31536000', // 1 year
     api: 'max-age=300, s-maxage=600', // 5min client, 10min CDN
     dynamic: 'max-age=60, s-maxage=300' // 1min client, 5min CDN
   }
   ```

2. **Implement Cache Invalidation**
   ```typescript
   // Smart cache invalidation on data changes
   const invalidateCache = async (pattern: string) => {
     await redis.del(`items:*`)
     await mutate(key => typeof key === 'string' && key.includes('items'))
   }
   ```

#### Medium Priority
3. **Service Worker for Offline Caching**
   ```typescript
   // Cache critical resources for offline access
   const CACHE_STRATEGY = {
     critical: 'cache-first',
     api: 'network-first',
     images: 'cache-first'
   }
   ```

---

## 7. Core Web Vitals Optimization

### Target Metrics
- **LCP < 2.5s** (Largest Contentful Paint)
- **FID < 100ms** (First Input Delay)
- **CLS < 0.1** (Cumulative Layout Shift)

### Optimization Strategy

#### LCP Optimization
1. **Preload Critical Resources**
   ```typescript
   // In layout.tsx
   <link rel="preload" href="/api/items" as="fetch" crossOrigin="anonymous" />
   <link rel="preconnect" href="https://supabase.co" />
   ```

2. **Optimize Critical Path**
   ```typescript
   // Defer non-critical JavaScript
   const NonCriticalComponent = dynamic(() => import('./heavy-component'), {
     loading: () => <Skeleton />
   })
   ```

#### FID Optimization
1. **Reduce JavaScript Execution Time**
   ```typescript
   // Use useTransition for non-urgent updates
   const [isPending, startTransition] = useTransition()
   
   const handleSearch = (query: string) => {
     startTransition(() => {
       setSearchQuery(query)
     })
   }
   ```

#### CLS Optimization
1. **Fix Layout Shifts**
   ```typescript
   // Reserve space for dynamic content
   <div className="min-h-[200px]"> // Prevent layout shift
     {loading ? <Skeleton /> : <Content />}
   </div>
   ```

---

## 8. AI Integration Performance

### Current Issues
1. **Blocking UI** during AI analysis
2. **No request queuing** for multiple uploads
3. **Large base64 payloads** in API requests
4. **No progress indicators** for long operations

### Optimization Plan

#### High Priority
1. **Implement Streaming Responses**
   ```typescript
   // Stream AI analysis results
   const analyzeImage = async (image: File) => {
     const response = await fetch('/api/ai/analyze-stream', {
       method: 'POST',
       body: formData
     })
     
     const reader = response.body?.getReader()
     // Process streaming response
   }
   ```

2. **Add Request Queuing**
   ```typescript
   // Queue multiple AI requests
   class AIRequestQueue {
     private queue: Promise<any>[] = []
     
     async enqueue(request: () => Promise<any>) {
       const promise = this.queue.length === 0 
         ? request() 
         : this.queue[this.queue.length - 1].then(request)
       
       this.queue.push(promise)
       return promise
     }
   }
   ```

3. **Optimize Image Processing**
   ```typescript
   // Compress images before sending to AI
   const compressForAI = async (file: File) => {
     // Reduce to max 1MB for AI analysis
     // Keep original for storage
   }
   ```

#### Medium Priority
4. **Implement Progress Tracking**
   ```typescript
   // Show detailed progress for AI operations
   const AIProgressTracker = {
     'uploading': 25,
     'processing': 50,
     'analyzing': 75,
     'complete': 100
   }
   ```

---

## 9. Implementation Priority & Timeline

### Phase 1: Critical Performance Fixes (Week 1-2)
1. Fix useEffect dependency warnings
2. Add database performance indexes
3. Implement image compression and blur placeholders
4. Set up bundle analyzer

### Phase 2: Core Optimizations (Week 3-4)
1. Split large components and implement memoization
2. Add Redis caching layer
3. Optimize API response payloads
4. Implement request deduplication

### Phase 3: Advanced Features (Week 5-6)
1. Add streaming AI responses
2. Implement virtual scrolling
3. Set up service worker caching
4. Optimize Core Web Vitals

### Phase 4: Monitoring & Fine-tuning (Week 7-8)
1. Set up performance monitoring
2. Implement A/B testing for optimizations
3. Fine-tune cache strategies
4. Performance regression testing

---

## 10. Monitoring & Measurement

### Performance Metrics Dashboard
```typescript
// Implement comprehensive performance tracking
const performanceMetrics = {
  webVitals: ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'],
  apiResponse: ['duration', 'success_rate', 'error_rate'],
  userExperience: ['conversion_rate', 'bounce_rate', 'time_on_page'],
  resources: ['bundle_size', 'image_load_time', 'cache_hit_rate']
}
```

### Automated Performance Testing
```yaml
# GitHub Actions performance testing
performance_tests:
  - lighthouse_ci
  - bundle_size_monitoring  
  - api_response_time_testing
  - core_web_vitals_tracking
```

---

## Expected Performance Improvements

### Bundle Size Reduction
- **Current**: 189kB First Load JS
- **Target**: <150kB (20% reduction)

### Page Load Performance
- **Current**: Unknown baseline
- **Target**: <2.5s LCP, <100ms FID, <0.1 CLS

### API Response Times
- **Current**: No baseline measurements
- **Target**: <500ms average response time

### User Experience Metrics
- **Reduced bounce rate** from faster loading
- **Increased conversion** from smoother interactions
- **Lower hosting costs** from optimized resource usage

---

## Conclusion

This comprehensive optimization plan addresses performance bottlenecks across the entire application stack. Implementation should be phased to ensure stability while delivering measurable improvements. The combination of React optimizations, database improvements, caching strategies, and AI performance enhancements will significantly improve user experience and reduce operational costs.

**Key Success Metrics:**
- 20% reduction in bundle size
- 30% improvement in page load times
- 50% reduction in API response times
- 25% improvement in Core Web Vitals scores

Regular monitoring and iterative improvements will ensure sustained performance gains as the application scales.