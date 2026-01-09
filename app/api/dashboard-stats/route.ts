import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Consolidated Dashboard API
 * Returns all dashboard data in a single request for better performance
 * Instead of 6 separate API calls, we make 1
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") // Optional year filter

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
      
      // Expenses - with items for calculations
      prisma.expense.findMany({
        where: { deletedAt: null },
        include: {
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
    return NextResponse.json({
      invoices,
      quotations,
      expenses,
      products,
      gearExpenses,
      bigExpenses,
      planning,
      timestamp: new Date().toISOString(), // For cache debugging
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    )
  }
}
