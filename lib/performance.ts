/**
 * Performance Monitoring Utilities
 * 
 * Track API response times and sizes for optimization
 */

export interface PerformanceMetrics {
  endpoint: string
  method: string
  duration: number
  responseSize?: number
  cacheHit?: boolean
  timestamp: string
}

/**
 * Measure API response time
 */
export function measurePerformance<T>(
  endpoint: string,
  method: string,
  fn: () => Promise<T>
): Promise<{ data: T; metrics: PerformanceMetrics }> {
  const start = Date.now()
  
  return fn().then((data) => {
    const duration = Date.now() - start
    
    const metrics: PerformanceMetrics = {
      endpoint,
      method,
      duration,
      timestamp: new Date().toISOString(),
    }
    
    // Log slow requests in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`⚠️ Slow API: ${method} ${endpoint} took ${duration}ms`)
    }
    
    return { data, metrics }
  })
}

/**
 * Calculate response payload size (approximate)
 */
export function getPayloadSize(data: any): number {
  try {
    const json = JSON.stringify(data)
    // Size in KB
    return Math.round(new TextEncoder().encode(json).length / 1024)
  } catch {
    return 0
  }
}

/**
 * Log performance metrics (development only)
 */
export function logPerformance(metrics: PerformanceMetrics & { responseSize?: number }) {
  if (process.env.NODE_ENV !== 'development') return
  
  const { endpoint, method, duration, responseSize, cacheHit } = metrics
  
  const cacheStatus = cacheHit ? '✅ CACHE HIT' : '🔄 DB QUERY'
  const sizeInfo = responseSize ? ` | ${responseSize}KB` : ''
  
  console.log(`📊 ${method} ${endpoint} | ${duration}ms${sizeInfo} | ${cacheStatus}`)
}

/**
 * Performance optimization tips based on metrics
 */
export function analyzePerformance(metrics: PerformanceMetrics & { responseSize?: number }): string[] {
  const tips: string[] = []
  
  // Slow query (> 1s)
  if (metrics.duration > 1000) {
    tips.push('Consider adding indexes or caching')
  }
  
  // Large payload (> 500KB)
  if (metrics.responseSize && metrics.responseSize > 500) {
    tips.push('Response payload is large - consider pagination or field selection')
  }
  
  // Medium payload (> 100KB) without cache
  if (metrics.responseSize && metrics.responseSize > 100 && !metrics.cacheHit) {
    tips.push('Consider adding Redis caching for this endpoint')
  }
  
  return tips
}

/**
 * Create performance monitoring middleware for Next.js API routes
 */
export function withPerformanceMonitoring<T>(
  handler: (request: Request) => Promise<Response>,
  endpoint: string
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const start = Date.now()
    const method = request.method
    
    const response = await handler(request)
    
    const duration = Date.now() - start
    
    // Clone response to read body (doesn't consume the original stream)
    const clonedResponse = response.clone()
    const data = await clonedResponse.json().catch(() => null)
    
    const metrics: PerformanceMetrics & { responseSize?: number } = {
      endpoint,
      method,
      duration,
      responseSize: data ? getPayloadSize(data) : undefined,
      cacheHit: data?.fromCache || false,
      timestamp: new Date().toISOString(),
    }
    
    // Log in development
    logPerformance(metrics)
    
    // Analyze and warn about issues
    const tips = analyzePerformance(metrics)
    if (tips.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn(`💡 Performance Tips for ${endpoint}:`)
      tips.forEach(tip => console.warn(`   - ${tip}`))
    }
    
    return response
  }
}
