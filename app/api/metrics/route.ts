import { NextResponse } from "next/server"
import { slowQueryLogger, formatSlowQueryReport } from "@/lib/slow-query-logger"

/**
 * Performance Metrics API
 * 
 * Exposes performance metrics for monitoring and debugging
 * Shows slow queries, cache hit rates, and system performance
 * 
 * Access: /api/metrics (development only by default)
 */

export async function GET(request: Request) {
  // Optional: Restrict access to development or authenticated users
  if (process.env.NODE_ENV === 'production') {
    // Check for auth token or API key
    const authHeader = request.headers.get('authorization')
    const apiKey = process.env.METRICS_API_KEY
    
    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }
  
  try {
    // Gather performance metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      
      // Memory usage
      memory: {
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(process.memoryUsage().external / 1024 / 1024)}MB`,
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      },
      
      // Slow queries
      slowQueries: formatSlowQueryReport(),
      
      // Top 10 slowest queries
      topSlowQueries: slowQueryLogger.getSlowestQueries(10).map(q => ({
        operation: `${q.model}.${q.action}`,
        duration: `${q.duration}ms`,
        timestamp: q.timestamp,
      })),
      
      // Query statistics by model
      queryStats: getQueryStatsByModel(),
      
      // Environment info
      environment: {
        nodeEnv: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
      },
    }
    
    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  } catch (error) {
    console.error("Error fetching metrics:", error)
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    )
  }
}

/**
 * Helper to calculate query statistics by model
 */
function getQueryStatsByModel() {
  const queries = slowQueryLogger.getSlowQueries()
  
  if (queries.length === 0) {
    return {}
  }
  
  const byModel = queries.reduce((acc, q) => {
    if (!acc[q.model]) {
      acc[q.model] = {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
      }
    }
    
    acc[q.model].count++
    acc[q.model].totalDuration += q.duration
    acc[q.model].maxDuration = Math.max(acc[q.model].maxDuration, q.duration)
    acc[q.model].minDuration = Math.min(acc[q.model].minDuration, q.duration)
    
    return acc
  }, {} as Record<string, any>)
  
  // Calculate averages
  Object.keys(byModel).forEach(model => {
    byModel[model].avgDuration = Math.round(
      byModel[model].totalDuration / byModel[model].count
    )
    byModel[model].totalDuration = `${byModel[model].totalDuration}ms`
    byModel[model].avgDuration = `${byModel[model].avgDuration}ms`
    byModel[model].maxDuration = `${byModel[model].maxDuration}ms`
    byModel[model].minDuration = `${byModel[model].minDuration}ms`
  })
  
  return byModel
}

/**
 * Clear metrics endpoint
 */
export async function DELETE(request: Request) {
  // Optional: Restrict access
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization')
    const apiKey = process.env.METRICS_API_KEY
    
    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }
  
  slowQueryLogger.clear()
  
  return NextResponse.json({
    message: 'Metrics cleared successfully',
    timestamp: new Date().toISOString(),
  })
}
