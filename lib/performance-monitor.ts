/**
 * Performance Testing Utilities
 * 
 * Measure and benchmark application performance
 * Use in development to identify bottlenecks
 */

interface PerformanceMark {
  name: string
  startTime: number
  duration?: number
}

class PerformanceMonitor {
  private marks: Map<string, PerformanceMark> = new Map()
  private measurements: PerformanceMark[] = []
  
  /**
   * Start measuring a task
   */
  start(name: string): void {
    if (typeof window === 'undefined') return // Server-side only for now
    
    this.marks.set(name, {
      name,
      startTime: performance.now(),
    })
  }
  
  /**
   * End measuring a task and record duration
   */
  end(name: string): number | null {
    if (typeof window === 'undefined') return null
    
    const mark = this.marks.get(name)
    if (!mark) {
      console.warn(`Performance mark "${name}" not found`)
      return null
    }
    
    const duration = performance.now() - mark.startTime
    const measurement: PerformanceMark = {
      ...mark,
      duration,
    }
    
    this.measurements.push(measurement)
    this.marks.delete(name)
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`)
    }
    
    return duration
  }
  
  /**
   * Measure a function execution time
   */
  async measure<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    this.start(name)
    try {
      const result = await fn()
      return result
    } finally {
      this.end(name)
    }
  }
  
  /**
   * Get all measurements
   */
  getMeasurements(): PerformanceMark[] {
    return [...this.measurements]
  }
  
  /**
   * Get average duration for a specific mark name
   */
  getAverage(name: string): number | null {
    const filtered = this.measurements.filter(m => m.name === name && m.duration)
    if (filtered.length === 0) return null
    
    const sum = filtered.reduce((acc, m) => acc + (m.duration || 0), 0)
    return sum / filtered.length
  }
  
  /**
   * Clear all measurements
   */
  clear(): void {
    this.marks.clear()
    this.measurements = []
  }
  
  /**
   * Print performance report
   */
  report(): void {
    if (this.measurements.length === 0) {
      console.log('No performance measurements recorded')
      return
    }
    
    console.group('📊 Performance Report')
    
    // Group by name
    const grouped = this.measurements.reduce((acc, m) => {
      if (!acc[m.name]) acc[m.name] = []
      acc[m.name].push(m.duration || 0)
      return acc
    }, {} as Record<string, number[]>)
    
    // Calculate stats for each group
    Object.entries(grouped).forEach(([name, durations]) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      const min = Math.min(...durations)
      const max = Math.max(...durations)
      
      console.log(`${name}:`)
      console.log(`  Count: ${durations.length}`)
      console.log(`  Avg: ${avg.toFixed(2)}ms`)
      console.log(`  Min: ${min.toFixed(2)}ms`)
      console.log(`  Max: ${max.toFixed(2)}ms`)
    })
    
    console.groupEnd()
  }
}

// Export singleton instance
export const perf = new PerformanceMonitor()

/**
 * Measure component render time (React 18+)
 */
export function useRenderTime(componentName: string) {
  if (typeof window === 'undefined') return
  
  const startTime = performance.now()
  
  // Use useEffect to measure mount time
  if (typeof window !== 'undefined' && 'useEffect' in React) {
    React.useEffect(() => {
      const duration = performance.now() - startTime
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎨 ${componentName} rendered in ${duration.toFixed(2)}ms`)
      }
    }, [])
  }
}

/**
 * Measure API response time
 */
export async function measureApiCall<T>(
  name: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  return perf.measure(name, fetchFn)
}

/**
 * Report Web Vitals (Core Web Vitals)
 */
export function reportWebVitals(metric: any) {
  if (process.env.NODE_ENV !== 'development') return
  
  const { name, value, id } = metric
  
  // Log Web Vitals
  console.log(`📈 ${name}:`, {
    value: `${Math.round(value)}ms`,
    id,
    rating: metric.rating,
  })
  
  // You could send these to an analytics service
  // analytics.send({ name, value, id })
}

/**
 * Measure First Contentful Paint (FCP)
 */
export function measureFCP() {
  if (typeof window === 'undefined') return
  
  const paintEntries = performance.getEntriesByType('paint')
  const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
  
  if (fcp) {
    console.log(`🎨 First Contentful Paint: ${fcp.startTime.toFixed(2)}ms`)
  }
}

/**
 * Measure Time to Interactive (TTI)
 */
export function measureTTI() {
  if (typeof window === 'undefined') return
  
  // Simple TTI approximation using domContentLoadedEventEnd
  const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  if (navigationTiming) {
    const tti = navigationTiming.domContentLoadedEventEnd
    console.log(`⚡ Time to Interactive: ${tti.toFixed(2)}ms`)
  }
}

// React import for useRenderTime
const React = typeof window !== 'undefined' ? require('react') : {}
