import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { invalidatePlanningCaches } from "@/lib/cache-invalidation"

// GET single planning by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const planning = await prisma.planning.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!planning) {
      return NextResponse.json(
        { error: "Planning not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(planning)
  } catch (error) {
    console.error("Error fetching planning:", error)
    return NextResponse.json(
      { error: "Failed to fetch planning" },
      { status: 500 }
    )
  }
}

// PUT update planning
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { projectName, clientName, clientBudget, notes, items, status } = body

    // Validate required fields
    if (!projectName || !clientName || clientBudget === undefined) {
      return NextResponse.json(
        { error: "Project name, client name, and client budget are required" },
        { status: 400 }
      )
    }

    // Use transaction for atomic updates with UPSERT pattern
    const planning = await prisma.$transaction(async (tx) => {
      // Update main planning data
      const updated = await tx.planning.update({
        where: { id },
        data: {
          projectName: projectName.trim(),
          clientName: clientName.trim(),
          clientBudget: parseFloat(clientBudget),
          notes: notes?.trim() || null,
          status: status || "draft",
        }
      })

      // Get existing item IDs from database
      const existingItems = await tx.planningItem.findMany({
        where: { planningId: id },
        select: { id: true }
      })
      const existingItemIds = new Set(existingItems.map(item => item.id))

      // Collect IDs from incoming data
      const incomingItemIds = new Set(
        items?.map((item: any) => item.id).filter(Boolean) || []
      )

      // Process items with order
      const itemsWithOrder = (items || []).map((item: any, index: number) => ({
        ...item,
        order: index
      }))
      
      // Separate items into update vs create batches
      const itemsToUpdate = itemsWithOrder.filter((item: any) => item.id && existingItemIds.has(item.id))
      const itemsToCreate = itemsWithOrder.filter((item: any) => !item.id || !existingItemIds.has(item.id))
      
      // Update existing items in parallel
      const updatePromises = itemsToUpdate.map((item: any) =>
        tx.planningItem.update({
          where: { id: item.id },
          data: {
            productName: item.productName,
            budget: parseFloat(item.budget),
            expense: parseFloat(item.expense),
            order: item.order
          }
        })
      )
      
      // Create new items
      const createItemResults = await Promise.all(
        itemsToCreate.map((item: any) =>
          tx.planningItem.create({
            data: {
              planningId: id,
              productName: item.productName,
              budget: parseFloat(item.budget),
              expense: parseFloat(item.expense),
              order: item.order
            }
          })
        )
      )
      
      // Execute all updates
      await Promise.all(updatePromises)
      
      // Collect newly created item IDs
      const newlyCreatedItemIds = createItemResults.map(item => item.id)
      
      // Delete removed items (items not in incoming data AND not just created)
      const allKeptItemIds = [
        ...Array.from(incomingItemIds).filter((id): id is string => typeof id === 'string' && existingItemIds.has(id)),
        ...newlyCreatedItemIds
      ]
      
      await tx.planningItem.deleteMany({
        where: {
          planningId: id,
          id: { notIn: allKeptItemIds }
        }
      })

      // Return updated planning with relations
      return tx.planning.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: { order: 'asc' }
          }
        }
      })
    })

    // Invalidate caches after updating planning
    await invalidatePlanningCaches(id)

    return NextResponse.json(planning)
  } catch (error) {
    console.error("Error updating planning:", error)
    return NextResponse.json(
      { error: "Failed to update planning" },
      { status: 500 }
    )
  }
}

// DELETE planning
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.planning.delete({
      where: { id }
    })

    // Invalidate caches after deleting planning
    await invalidatePlanningCaches(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting planning:", error)
    return NextResponse.json(
      { error: "Failed to delete planning" },
      { status: 500 }
    )
  }
}

