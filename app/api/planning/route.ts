import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateId } from "@/lib/id-generator"
import { invalidatePlanningCaches } from "@/lib/cache-invalidation"
import { generateUniqueName } from "@/lib/name-validator"

// GET all plannings with optional filters (optimized with pagination)
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
        { planningId: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Fetch data with pagination - optimized for list view
    const [plannings, total] = await Promise.all([
      prisma.planning.findMany({
        where,
        select: {
          id: true,
          planningId: true,
          projectName: true,
          clientName: true,
          clientBudget: true,
          status: true,
          generatedQuotationId: true,
          createdAt: true,
          updatedAt: true,
          // Don't fetch items in list view - only in detail view
        },
        orderBy: {
          updatedAt: sortBy === "oldest" ? "asc" : "desc"
        },
        take: limit,
        skip: skip
      }),
      prisma.planning.count({ where })
    ])

    // Return paginated response
    return NextResponse.json({
      data: plannings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching plannings:", error)
    return NextResponse.json(
      { error: "Failed to fetch plannings" },
      { status: 500 }
    )
  }
}

// POST create new planning
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectName, clientName, clientBudget, notes, items, status } = body

    // Validate required fields
    if (!projectName || !clientName || clientBudget === undefined) {
      return NextResponse.json(
        { error: "Project name, client name, and client budget are required" },
        { status: 400 }
      )
    }

    // Generate unique planning ID (optimized with cache)
    const planningId = await generateId('PLN', 'planning')

    // Generate unique project name if there's a conflict
    const uniqueProjectName = await generateUniqueName(projectName.trim(), 'planning')

    // Create planning with items
    const planning = await prisma.planning.create({
      data: {
        planningId,
        projectName: uniqueProjectName,
        clientName: clientName.trim(),
        clientBudget: parseFloat(clientBudget),
        notes: notes?.trim() || null,
        status: status || "draft",
        items: {
          create: items?.map((item: any) => ({
            productName: item.productName,
            budget: parseFloat(item.budget),
            expense: parseFloat(item.expense)
          })) || []
        }
      },
      include: {
        items: true
      }
    })

    // Invalidate caches after creating planning
    await invalidatePlanningCaches()

    return NextResponse.json(planning, { status: 201 })
  } catch (error) {
    console.error("Error creating planning:", error)
    return NextResponse.json(
      { error: "Failed to create planning" },
      { status: 500 }
    )
  }
}

