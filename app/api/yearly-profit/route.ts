import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Yearly Profit API
 * Calculates gross and net profit for a given year
 * 
 * Gross Profit = Total paid amount from final expenses
 * Net Profit = Gross Profit - Total Actual Expenses - Gear Expenses - Big Expenses
 */
export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get("year")

    // Default to current year if not specified
    const currentYear = new Date().getFullYear()
    const selectedYear = yearParam ? parseInt(yearParam) : currentYear

    // Build date range for the selected year
    const yearStart = new Date(selectedYear, 0, 1) // Jan 1
    const yearEnd = new Date(selectedYear + 1, 0, 1) // Jan 1 next year

    // Fetch ALL expenses once to get both profit data and available years
    const allExpenses = await prisma.expense.findMany({
      where: { 
        deletedAt: null,
      },
      select: {
        productionDate: true,
        status: true,
        paidAmount: true,
        items: {
          select: {
            actual: true,
          },
        },
      },
    })

    // Filter expenses for the selected year with status 'final'
    const yearExpenses = allExpenses.filter(exp => {
      const expDate = new Date(exp.productionDate)
      return exp.status === 'final' && expDate >= yearStart && expDate < yearEnd
    })

    // Extract available years from all expenses
    const yearsSet = new Set(
      allExpenses.map(exp => new Date(exp.productionDate).getFullYear())
    )
    const availableYears = Array.from(yearsSet).sort((a, b) => b - a)

    // If no years found, use current year
    if (availableYears.length === 0) {
      availableYears.push(currentYear)
    }

    // Fetch gear expenses for the year
    const gearExpenses = await prisma.gearExpense.findMany({
      where: { 
        deletedAt: null,
        year: selectedYear,
      },
      select: {
        amount: true,
      },
    })

    // Fetch big expenses for the year
    const bigExpenses = await prisma.bigExpense.findMany({
      where: { 
        deletedAt: null,
        year: selectedYear,
      },
      select: {
        amount: true,
      },
    })

    // Calculate gross profit (total paid amount)
    const grossProfit = yearExpenses.reduce((sum, exp) => sum + (exp.paidAmount || 0), 0)

    // Calculate total actual expenses
    const totalActualExpenses = yearExpenses.reduce((sum, exp) => {
      const expenseTotal = exp.items.reduce((itemSum, item) => itemSum + item.actual, 0)
      return sum + expenseTotal
    }, 0)

    // Calculate total gear expenses
    const totalGearExpenses = gearExpenses.reduce((sum, gear) => sum + gear.amount, 0)

    // Calculate total big expenses
    const totalBigExpenses = bigExpenses.reduce((sum, big) => sum + big.amount, 0)

    // Calculate net profit (gross profit - actual expenses - gear expenses - big expenses)
    const netProfit = grossProfit - totalActualExpenses - totalGearExpenses - totalBigExpenses

    const duration = Date.now() - startTime

    return NextResponse.json({
      grossProfit,
      netProfit,
      selectedYear,
      availableYears,
      timestamp: new Date().toISOString(),
      _meta: {
        duration,
      }
    })
  } catch (error) {
    console.error("Error fetching yearly profit:", error)
    return NextResponse.json(
      { error: "Failed to fetch yearly profit" },
      { status: 500 }
    )
  }
}
