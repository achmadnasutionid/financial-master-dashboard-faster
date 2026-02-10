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
 * - Redis caching (5min TTL)
 * - Field selection (only necessary fields)
 * - Parallel queries
 * - Response compression (automatic via Next.js)
 * - Performance monitoring
 */
export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") // Optional year filter
    const skipCache = searchParams.get("skipCache") === "true" // Force fresh data

    // Try to get from cache first
    if (!skipCache) {
      const cached = await cache.get(cacheKeys.dashboardStats())
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
    const [
      invoices,
      quotations,
      expenses,
      products,
      gearExpenses,
      bigExpenses,
      planning,
    ] = await Promise.all([
      // Invoices - all active records
      prisma.invoice.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          invoiceId: true,
          productionDate: true,
          totalAmount: true,
          status: true,
          updatedAt: true,
        },
      }),
      
      // Quotations - all active records
      prisma.quotation.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          quotationId: true,
          productionDate: true,
          totalAmount: true,
          status: true,
          updatedAt: true,
        },
      }),
      
      // Expenses - with items for calculations (optimized)
      prisma.expense.findMany({
        where: { deletedAt: null },
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
      
      // Products - for master data dropdown
      prisma.product.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
        },
      }),
      
      // Gear Expenses - all active records
      prisma.gearExpense.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          amount: true,
          year: true,
        },
      }),
      
      // Big Expenses - all active records
      prisma.bigExpense.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          amount: true,
          year: true,
        },
      }),
      
      // Planning - for recent activities
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
      timestamp: new Date().toISOString(), // For cache debugging
    }

    // Cache for 5 minutes (300 seconds)
    await cache.set(cacheKeys.dashboardStats(), responseData, 300)

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
