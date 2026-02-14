import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { invalidateExpenseCaches } from "@/lib/cache-invalidation"
import { generateUniqueName } from "@/lib/name-validator"
import { safeParseFloat } from "@/lib/number-validator"

// GET single expense
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!expense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error fetching expense:", error)
    return NextResponse.json(
      { error: "Failed to fetch expense" },
      { status: 500 }
    )
  }
}

// PUT update expense
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // If only status is provided, just update the status
    if (body.status && Object.keys(body).length === 1) {
      const expense = await prisma.expense.update({
        where: { id },
        data: {
          status: body.status
        },
        include: {
          items: {
            orderBy: { order: 'asc' }
          }
        }
      })
      
      return NextResponse.json(expense)
    }

    // Use transaction for atomic updates with UPSERT pattern
    const expense = await prisma.$transaction(async (tx) => {
      // Validate mandatory fields
      if (!body.productionDate) {
        throw new Error('Production date is required')
      }

      // Generate unique project name if there's a conflict
      const uniqueProjectName = body.projectName ? await generateUniqueName(body.projectName, 'expense', id) : body.projectName

      // Update main expense data
      const updated = await tx.expense.update({
        where: { id },
        data: {
          projectName: uniqueProjectName,
          productionDate: new Date(body.productionDate),
          clientBudget: safeParseFloat(body.clientBudget),
          paidAmount: safeParseFloat(body.paidAmount),
          notes: body.notes || null,
          status: body.status || "draft",
          totalItemBudgeted: safeParseFloat(body.totalItemBudgeted),
          totalItemDifferences: safeParseFloat(body.totalItemDifferences),
        }
      })

      // Get existing item IDs from database
      const existingItems = await tx.expenseItem.findMany({
        where: { expenseId: id },
        select: { id: true }
      })
      const existingItemIds = new Set(existingItems.map(item => item.id))

      // Collect IDs from incoming data
      const incomingItemIds = new Set(
        body.items?.map((item: any) => item.id).filter(Boolean) || []
      )

      // Process items with order
      const itemsWithOrder = (body.items || []).map((item: any, index: number) => ({
        ...item,
        order: index
      }))
      
      // Separate items into update vs create batches
      const itemsToUpdate = itemsWithOrder.filter((item: any) => item.id && existingItemIds.has(item.id))
      const itemsToCreate = itemsWithOrder.filter((item: any) => !item.id || !existingItemIds.has(item.id))
      
      // Update existing items in parallel
      const updatePromises = itemsToUpdate.map((item: any) =>
        tx.expenseItem.update({
          where: { id: item.id },
          data: {
            productName: item.productName,
            budgeted: safeParseFloat(item.budgeted),
            actual: safeParseFloat(item.actual),
            difference: safeParseFloat(item.budgeted) - safeParseFloat(item.actual),
            order: item.order
          }
        })
      )
      
      // Create new items
      const createItemResults = await Promise.all(
        itemsToCreate.map((item: any) =>
          tx.expenseItem.create({
            data: {
              expenseId: id,
              productName: item.productName,
              budgeted: safeParseFloat(item.budgeted),
              actual: safeParseFloat(item.actual),
              difference: safeParseFloat(item.budgeted) - safeParseFloat(item.actual),
              order: item.order
            }
          })
        )
      )
      
      // Execute all updates
      await Promise.all(updatePromises)
      
      // Collect newly created item IDs
      const newlyCreatedItemIds = createItemResults.map(item => item.id)
      
      // Delete removed items
      const allKeptItemIds = [
        ...Array.from(incomingItemIds).filter((id): id is string => typeof id === 'string' && existingItemIds.has(id)),
        ...newlyCreatedItemIds
      ]
      
      await tx.expenseItem.deleteMany({
        where: {
          expenseId: id,
          id: { notIn: allKeptItemIds }
        }
      })

      // Return updated expense with relations
      return tx.expense.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: { order: 'asc' }
          }
        }
      })
    })

    // Invalidate caches after updating expense
    await invalidateExpenseCaches(id)

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error updating expense:", error)
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    )
  }
}

// DELETE expense
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Delete the expense
    await prisma.expense.delete({
      where: { id }
    })

    // Invalidate caches after deleting expense
    await invalidateExpenseCaches(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting expense:", error)
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    )
  }
}

