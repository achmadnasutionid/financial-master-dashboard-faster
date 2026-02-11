/**
 * Slow Query Logger
 * 
 * Tracks and logs slow database queries for optimization
 * Helps identify performance bottlenecks in production
 */

interface SlowQuery {
  model: string
  action: string
  duration: number
  timestamp: string
  params?: any
}

class SlowQueryLogger {
  private slowQueries: SlowQuery[] = []
  private readonly SLOW_THRESHOLD_MS = 1000 // Queries over 1s are considered slow
  private readonly MAX_STORED_QUERIES = 100 // Keep last 100 slow queries
  
  /**
   * Log a slow query
   */
  log(query: SlowQuery): void {
    this.slowQueries.push(query)
    
    // Keep only last MAX_STORED_QUERIES
    if (this.slowQueries.length > this.MAX_STORED_QUERIES) {
      this.slowQueries.shift()
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`🐌 Slow Query Detected:`, {
        operation: `${query.model}.${query.action}`,
        duration: `${query.duration}ms`,
        timestamp: query.timestamp,
      })
    }
  }
  
  /**
   * Get all slow queries
   */
  getSlowQueries(): SlowQuery[] {
    return [...this.slowQueries]
  }
  
  /**
   * Get slow queries for a specific model
   */
  getSlowQueriesForModel(model: string): SlowQuery[] {
    return this.slowQueries.filter(q => q.model === model)
  }
  
  /**
   * Get slowest queries (top N)
   */
  getSlowestQueries(limit: number = 10): SlowQuery[] {
    return [...this.slowQueries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }
  
  /**
   * Get average query time for a model
   */
  getAverageQueryTime(model: string): number | null {
    const queries = this.getSlowQueriesForModel(model)
    if (queries.length === 0) return null
    
    const sum = queries.reduce((acc, q) => acc + q.duration, 0)
    return sum / queries.length
  }
  
  /**
   * Clear all logged queries
   */
  clear(): void {
    this.slowQueries = []
  }
  
  /**
   * Generate performance report
   */
  generateReport(): string {
    if (this.slowQueries.length === 0) {
      return 'No slow queries detected'
    }
    
    const report: string[] = ['📊 Slow Query Report', '']
    
    // Group by model
    const byModel = this.slowQueries.reduce((acc, q) => {
      if (!acc[q.model]) acc[q.model] = []
      acc[q.model].push(q)
      return acc
    }, {} as Record<string, SlowQuery[]>)
    
    Object.entries(byModel).forEach(([model, queries]) => {
      const avg = queries.reduce((sum, q) => sum + q.duration, 0) / queries.length
      const max = Math.max(...queries.map(q => q.duration))
      
      report.push(`${model}:`)
      report.push(`  Count: ${queries.length}`)
      report.push(`  Avg: ${avg.toFixed(0)}ms`)
      report.push(`  Max: ${max.toFixed(0)}ms`)
      report.push('')
    })
    
    return report.join('\n')
  }
  
  /**
   * Check if threshold should be adjusted based on query patterns
   */
  suggestThreshold(): number {
    if (this.slowQueries.length < 10) return this.SLOW_THRESHOLD_MS
    
    // Calculate P95 (95th percentile)
    const sorted = [...this.slowQueries].sort((a, b) => a.duration - b.duration)
    const p95Index = Math.floor(sorted.length * 0.95)
    const p95 = sorted[p95Index].duration
    
    return Math.max(500, Math.round(p95 * 0.8)) // Suggest 80% of P95, minimum 500ms
  }
}

export const slowQueryLogger = new SlowQueryLogger()

/**
 * Middleware function to track slow queries
 * Add this to your Prisma client initialization
 */
export function createSlowQueryMiddleware(thresholdMs: number = 1000) {
  return async (params: any, next: any) => {
    const startTime = Date.now()
    const result = await next(params)
    const duration = Date.now() - startTime
    
    // Log if query is slow
    if (duration > thresholdMs) {
      slowQueryLogger.log({
        model: params.model || 'unknown',
        action: params.action,
        duration,
        timestamp: new Date().toISOString(),
        params: process.env.NODE_ENV === 'development' ? params.args : undefined,
      })
    }
    
    return result
  }
}

/**
 * Helper to format slow query report for monitoring tools
 */
export function formatSlowQueryReport() {
  const queries = slowQueryLogger.getSlowQueries()
  
  if (queries.length === 0) {
    return {
      status: 'healthy',
      slowQueryCount: 0,
      message: 'No slow queries detected',
    }
  }
  
  const slowest = slowQueryLogger.getSlowestQueries(5)
  const suggestedThreshold = slowQueryLogger.suggestThreshold()
  
  return {
    status: queries.length > 50 ? 'warning' : 'info',
    slowQueryCount: queries.length,
    slowestQueries: slowest.map(q => ({
      operation: `${q.model}.${q.action}`,
      duration: `${q.duration}ms`,
      timestamp: q.timestamp,
    })),
    suggestedThreshold: `${suggestedThreshold}ms`,
    report: slowQueryLogger.generateReport(),
  }
}
