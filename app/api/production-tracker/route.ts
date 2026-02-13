import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateId } from "@/lib/id-generator"
import { cache, cacheKeys } from "@/lib/redis"

// GET all production trackers
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const sortBy = searchParams.get("sortBy") || "newest"
    
    const where: any = {
      deletedAt: null
    }
    
    if (search) {
      where.AND = [
        { deletedAt: null },
        {
          OR: [
            { trackerId: { contains: search, mode: 'insensitive' } },
            { expenseId: { contains: search, mode: 'insensitive' } },
            { projectName: { contains: search, mode: 'insensitive' } }
          ]
        }
      ]
    }

    const trackers = await prisma.productionTracker.findMany({
      where,
      orderBy: {
        createdAt: sortBy === "oldest" ? "asc" : "desc"
      }
    })

    return NextResponse.json(trackers)
  } catch (error) {
    console.error("Error fetching production trackers:", error)
    return NextResponse.json(
      { error: "Failed to fetch production trackers" },
      { status: 500 }
    )
  }
}

// Helper function to generate unique project name with incremental suffix
async function generateUniqueProjectName(baseProjectName: string, excludeId?: string): Promise<string> {
  if (!baseProjectName.trim()) {
    return baseProjectName
  }

  // Check if project name already exists (excluding the current tracker if updating)
  const where: any = {
    projectName: baseProjectName,
    deletedAt: null
  }
  if (excludeId) {
    where.id = { not: excludeId }
  }

  const existingTracker = await prisma.productionTracker.findFirst({
    where
  })

  // If no conflict, return original name
  if (!existingTracker) {
    return baseProjectName
  }

  // If conflict exists, find the next available number
  let suffix = 2
  let newProjectName = `${baseProjectName} 0${suffix}`
  
  while (true) {
    const conflictWhere: any = {
      projectName: newProjectName,
      deletedAt: null
    }
    if (excludeId) {
      conflictWhere.id = { not: excludeId }
    }

    const conflict = await prisma.productionTracker.findFirst({
      where: conflictWhere
    })

    if (!conflict) {
      return newProjectName
    }

    suffix++
    // Format: " 02", " 03", ..., " 09", " 10", " 11", etc.
    newProjectName = `${baseProjectName} ${suffix < 10 ? '0' : ''}${suffix}`
  }
}

// POST create new production tracker
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Generate unique tracker ID
    const trackerId = await generateId('PT', 'productionTracker')

    // Generate unique project name if there's a conflict
    const uniqueProjectName = await generateUniqueProjectName(body.projectName || "")

    // Create production tracker
    const tracker = await prisma.productionTracker.create({
      data: {
        trackerId,
        expenseId: body.expenseId || "",
        invoiceId: body.invoiceId || null,
        projectName: uniqueProjectName,
        date: body.date ? new Date(body.date) : new Date(),
        subtotal: parseFloat(body.subtotal) || 0,
        totalAmount: parseFloat(body.totalAmount) || 0,
        expense: parseFloat(body.expense) || 0,
        productAmounts: body.productAmounts || {},
        notes: body.notes || null,
        status: body.status || "pending"
      }
    })

    // Invalidate caches after creating tracker
    await Promise.all([
      cache.delete(cacheKeys.dashboardStats()),
      cache.delete('tracker:list:*'),
    ])

    return NextResponse.json(tracker, { status: 201 })
  } catch (error: any) {
    console.error("Error creating production tracker:", error)
    return NextResponse.json(
      { 
        error: "Failed to create production tracker",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    )
  }
}
