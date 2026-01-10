import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateId } from "@/lib/id-generator"

// GET all expenses
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const sortBy = searchParams.get("sortBy") || "newest"
    const includeDeleted = searchParams.get("includeDeleted") === "true"

    const where: any = {}
    if (status && status !== "all") {
      where.status = status
    }
    // Filter out soft-deleted records by default
    if (!includeDeleted) {
      where.deletedAt = null
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        items: true,
        invoice: {
          select: {
            productionDate: true
          }
        }
      },
      orderBy: {
        updatedAt: sortBy === "oldest" ? "asc" : "desc"
      }
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    )
  }
}

// POST create new expense
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.projectName) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      )
    }

    if (!body.productionDate) {
      return NextResponse.json(
        { error: "Production date is required" },
        { status: 400 }
      )
    }

    // Generate unique expense ID (optimized with cache)
    const expenseId = await generateId('EXP', 'expense')

    // Create expense with items
    const expense = await prisma.expense.create({
      data: {
        expenseId,
        invoiceId: body.invoiceId || null,
        planningId: body.planningId || null,
        projectName: body.projectName,
        productionDate: new Date(body.productionDate),
        clientBudget: parseFloat(body.clientBudget) || 0,
        paidAmount: parseFloat(body.paidAmount) || 0,
        totalItemBudgeted: parseFloat(body.totalItemBudgeted) || 0,
        totalItemDifferences: parseFloat(body.totalItemDifferences) || 0,
        notes: body.notes || null,
        status: body.status || "draft",
        items: {
          create: body.items?.map((item: any) => ({
            productName: item.productName,
            budgeted: parseFloat(item.budgeted),
            actual: parseFloat(item.actual),
            difference: parseFloat(item.budgeted) - parseFloat(item.actual)
          })) || []
        }
      },
      include: {
        items: true
      }
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error: any) {
    console.error("Error creating expense:", error)
    return NextResponse.json(
      { 
        error: "Failed to create expense",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    )
  }
}

