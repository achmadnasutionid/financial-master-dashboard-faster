import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateId } from "@/lib/id-generator"
import { invalidateExpenseCaches } from "@/lib/cache-invalidation"
import { cache, cacheKeys } from "@/lib/redis"
import { generateUniqueName } from "@/lib/name-validator"

// GET all expenses (optimized with pagination + Redis caching)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const sortBy = searchParams.get("sortBy") || "newest"
    const includeDeleted = searchParams.get("includeDeleted") === "true"
    const search = searchParams.get("search") || ""
    
    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    // Build cache key (only cache non-search queries to avoid cache pollution)
    const shouldCache = !search && !includeDeleted
    const cacheKey = shouldCache 
      ? `${cacheKeys.expenseList(page)}:${status || 'all'}:${sortBy}:${limit}`
      : null

    // Try to get from cache first
    if (cacheKey) {
      const cached = await cache.get(cacheKey)
      if (cached) {
        return NextResponse.json({ ...cached, fromCache: true })
      }
    }

    // Build where clause
    const where: any = {}
    if (status && status !== "all") {
      where.status = status
    }
    if (!includeDeleted) {
      where.deletedAt = null
    }
    
    // Add search filter (if provided)
    if (search) {
      where.OR = [
        { expenseId: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } } // Search by snapshot
      ]
    }

    // Fetch data with pagination - optimized for list view
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
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
          createdAt: true,
          updatedAt: true,
          // Snapshot fields
          invoiceNumber: true,
          invoiceProductionDate: true,
          // Include items for calculation in list view
          items: {
            select: {
              actual: true
            }
          }
        },
        orderBy: {
          updatedAt: sortBy === "oldest" ? "asc" : "desc"
        },
        take: limit,
        skip: skip
      }),
      prisma.expense.count({ where })
    ])

    const response = {
      data: expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      fromCache: false
    }

    // Cache for 2 minutes (common list queries)
    if (cacheKey) {
      await cache.set(cacheKey, response, 120)
    }

    // Return paginated response
    return NextResponse.json(response)
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

    // Generate unique project name if there's a conflict
    const uniqueProjectName = await generateUniqueName(body.projectName, 'expense')

    // Create expense with items
    const expense = await prisma.expense.create({
      data: {
        expenseId,
        invoiceId: body.invoiceId || null,
        projectName: uniqueProjectName,
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

    // Invalidate caches after creating expense
    await invalidateExpenseCaches()

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

