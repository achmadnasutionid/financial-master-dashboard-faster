import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cache, cacheKeys } from "@/lib/redis"
import { getPayloadSize, logPerformance } from "@/lib/performance"

/**
 * Consolidated Dashboard API
 * Returns all dashboard data in a single request for better performance
 * Instead of 6 separate API calls, we make 1
 * 
 * Performance optimizations:
 * - Year-based filtering (default: current year) for faster queries
 * - Redis caching (5min TTL) per year
 * - Field selection (only necessary fields)
 * - Parallel queries
 * - Response compression (automatic via Next.js)
 * - Performance monitoring
 */
export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get("year")
    const skipCache = searchParams.get("skipCache") === "true" // Force fresh data

    // Default to current year if not specified
    const currentYear = new Date().getFullYear()
    const selectedYear = yearParam ? parseInt(yearParam) : currentYear

    // Build date range for the selected year
    const yearStart = new Date(selectedYear, 0, 1) // Jan 1
    const yearEnd = new Date(selectedYear + 1, 0, 1) // Jan 1 next year

    // Cache key includes year for separate caching
    const cacheKey = `${cacheKeys.dashboardStats()}:${selectedYear}`

    // Try to get from cache first
    if (!skipCache) {
      const cached = await cache.get(cacheKey)
      if (cached) {
        const duration = Date.now() - startTime
        const payloadSize = getPayloadSize(cached)
        
        // Log cache hit performance
        logPerformance({
          endpoint: '/api/dashboard-stats',
          method: 'GET',
          duration,
          responseSize: payloadSize,
          cacheHit: true,
          timestamp: new Date().toISOString()
        })
        
        return NextResponse.json({
          ...cached,
          fromCache: true,
          timestamp: new Date().toISOString(),
          _meta: {
            duration,
            payloadSize,
          }
        })
      }
    }

    // Fetch all data in parallel for maximum speed
    // OPTIMIZED: Only fetch data for selected year
    const [
      invoices,
      quotations,
      expenses,
      products,
      gearExpenses,
      bigExpenses,
      planning,
    ] = await Promise.all([
      // Invoices - current year only
      prisma.invoice.findMany({
        where: { 
          deletedAt: null,
          productionDate: {
            gte: yearStart,
            lt: yearEnd,
          }
        },
        select: {
          id: true,
          invoiceId: true,
          productionDate: true,
          totalAmount: true,
          status: true,
          updatedAt: true,
        },
      }),
      
      // Quotations - current year only
      prisma.quotation.findMany({
        where: { 
          deletedAt: null,
          productionDate: {
            gte: yearStart,
            lt: yearEnd,
          }
        },
        select: {
          id: true,
          quotationId: true,
          productionDate: true,
          totalAmount: true,
          status: true,
          updatedAt: true,
        },
      }),
      
      // Expenses - current year only (with items for calculations)
      prisma.expense.findMany({
        where: { 
          deletedAt: null,
          productionDate: {
            gte: yearStart,
            lt: yearEnd,
          }
        },
        select: {
          id: true,
          expenseId: true,
          projectName: true,
          productionDate: true,
          clientBudget: true,
          paidAmount: true,
          totalItemBudgeted: true,
          totalItemDifferences: true,
          status: true,
          updatedAt: true,
          items: {
            select: {
              productName: true,
              budgeted: true,
              actual: true,
              difference: true,
            },
          },
        },
      }),
      
      // Products - for master data dropdown (no year filter)
      prisma.product.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
        },
      }),
      
      // Gear Expenses - current year only
      prisma.gearExpense.findMany({
        where: { 
          deletedAt: null,
          year: selectedYear,
        },
        select: {
          id: true,
          name: true,
          amount: true,
          year: true,
        },
      }),
      
      // Big Expenses - current year only
      prisma.bigExpense.findMany({
        where: { 
          deletedAt: null,
          year: selectedYear,
        },
        select: {
          id: true,
          name: true,
          amount: true,
          year: true,
        },
      }),
      
      // Planning - for recent activities (limit to recent 50, no year filter)
      prisma.planning.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          planningId: true,
          status: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 50, // Limit to recent 50
      }),
    ])

    // Return all data in one response
    const responseData = {
      invoices,
      quotations,
      expenses,
      products,
      gearExpenses,
      bigExpenses,
      planning,
      selectedYear, // Include selected year in response
      timestamp: new Date().toISOString(), // For cache debugging
    }

    // Cache for 5 minutes (300 seconds) - separate cache per year
    await cache.set(cacheKey, responseData, 300)

    const duration = Date.now() - startTime
    const payloadSize = getPayloadSize(responseData)
    
    // Log performance metrics in development
    logPerformance({
      endpoint: '/api/dashboard-stats',
      method: 'GET',
      duration,
      responseSize: payloadSize,
      cacheHit: false,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      ...responseData,
      fromCache: false,
      _meta: {
        duration,
        payloadSize,
      }
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    )
  }
}
