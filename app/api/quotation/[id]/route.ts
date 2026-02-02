import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET single quotation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            details: true
          }
        },
        remarks: true
      }
    })

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(quotation)
  } catch (error) {
    console.error("Error fetching quotation:", error)
    return NextResponse.json(
      { error: "Failed to fetch quotation" },
      { status: 500 }
    )
  }
}

// PUT update quotation (Optimized with UPSERT pattern)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // If only status is provided, just update the status (for accepting quotation)
    if (body.status && Object.keys(body).length === 1) {
      const quotation = await prisma.quotation.update({
        where: { id },
        data: {
          status: body.status
        },
        include: {
          items: {
            include: {
              details: true
            }
          },
          remarks: true
        }
      })
      
      return NextResponse.json(quotation)
    }

    // Use transaction for atomic updates with UPSERT pattern
    const quotation = await prisma.$transaction(async (tx) => {
      // Update main quotation data
      const updated = await tx.quotation.update({
        where: { id },
        data: {
          companyName: body.companyName,
          companyAddress: body.companyAddress,
          companyCity: body.companyCity,
          companyProvince: body.companyProvince,
          companyTelp: body.companyTelp || null,
          companyEmail: body.companyEmail || null,
          productionDate: new Date(body.productionDate),
          billTo: body.billTo,
          notes: body.notes || null,
          billingName: body.billingName,
          billingBankName: body.billingBankName,
          billingBankAccount: body.billingBankAccount,
          billingBankAccountName: body.billingBankAccountName,
          billingKtp: body.billingKtp || null,
          billingNpwp: body.billingNpwp || null,
          signatureName: body.signatureName,
          signatureRole: body.signatureRole || null,
          signatureImageData: body.signatureImageData,
          pph: body.pph,
          totalAmount: parseFloat(body.totalAmount),
          status: body.status || "draft",
        }
      })

      // Get existing item IDs from database
      const existingItems = await tx.quotationItem.findMany({
        where: { quotationId: id },
        select: { id: true }
      })
      const existingItemIds = new Set(existingItems.map(item => item.id))

      // Collect IDs from incoming data
      const incomingItemIds = new Set(
        body.items?.map((item: any) => item.id).filter(Boolean) || []
      )
      const incomingRemarkIds = new Set(
        body.remarks?.map((remark: any) => remark.id).filter(Boolean) || []
      )

      // UPSERT items and details (OPTIMIZED - batch operations)
      // Separate items into update vs create batches
      const itemsToUpdate = (body.items || []).filter((item: any) => item.id && existingItemIds.has(item.id))
      const itemsToCreate = (body.items || []).filter((item: any) => !item.id || !existingItemIds.has(item.id))
      
      // Collect all details to be deleted for updated items
      const itemIdsToDeleteDetails = itemsToUpdate.map((item: any) => item.id)
      
      // Step 1: Update all existing items in parallel
      const updatePromises = itemsToUpdate.map((item: any) =>
        tx.quotationItem.update({
          where: { id: item.id },
          data: {
            productName: item.productName,
            total: parseFloat(item.total),
          }
        })
      )
      
      // Step 2: Delete all old details for updated items (single query)
      const deleteDetailsPromise = itemIdsToDeleteDetails.length > 0
        ? tx.quotationItemDetail.deleteMany({
            where: { quotationItemId: { in: itemIdsToDeleteDetails } }
          })
        : Promise.resolve()
      
      // Step 3: Create new items with details in parallel
      const createItemResults = await Promise.all(
        itemsToCreate.map((item: any) =>
          tx.quotationItem.create({
            data: {
              quotationId: id,
              productName: item.productName,
              total: parseFloat(item.total),
              details: {
                create: item.details?.map((detail: any) => ({
                  detail: detail.detail,
                  unitPrice: parseFloat(detail.unitPrice),
                  qty: parseFloat(detail.qty),
                  amount: parseFloat(detail.amount)
                })) || []
              }
            }
          })
        )
      )
      
      // Execute all updates and deletes in parallel
      await Promise.all([...updatePromises, deleteDetailsPromise])
      
      // Collect newly created item IDs to prevent them from being deleted
      const newlyCreatedItemIds = createItemResults.map(item => item.id)
      
      // Step 4: Bulk create new details for updated items
      const allNewDetails = itemsToUpdate.flatMap((item: any) =>
        (item.details || []).map((detail: any) => ({
          quotationItemId: item.id,
          detail: detail.detail,
          unitPrice: parseFloat(detail.unitPrice),
          qty: parseFloat(detail.qty),
          amount: parseFloat(detail.amount)
        }))
      )
      
      if (allNewDetails.length > 0) {
        await tx.quotationItemDetail.createMany({
          data: allNewDetails
        })
      }

      // Delete removed items (items not in incoming data AND not just created)
      // Combine existing item IDs from frontend with newly created IDs
      const allKeptItemIds = [
        ...Array.from(incomingItemIds).filter((id): id is string => typeof id === 'string' && existingItemIds.has(id)),
        ...newlyCreatedItemIds
      ]
      
      await tx.quotationItem.deleteMany({
        where: {
          quotationId: id,
          id: { notIn: allKeptItemIds }
        }
      })

      // Get existing remark IDs from database
      const existingRemarks = await tx.quotationRemark.findMany({
        where: { quotationId: id },
        select: { id: true }
      })
      const existingRemarkIds = new Set(existingRemarks.map(remark => remark.id))

      // UPSERT remarks (OPTIMIZED - batch operations)
      const remarksToUpdate = (body.remarks || []).filter((remark: any) => remark.id && existingRemarkIds.has(remark.id))
      const remarksToCreate = (body.remarks || []).filter((remark: any) => !remark.id || !existingRemarkIds.has(remark.id))
      
      // Update all existing remarks in parallel
      const updateRemarkPromises = remarksToUpdate.map((remark: any) =>
        tx.quotationRemark.update({
          where: { id: remark.id },
          data: {
            text: remark.text,
            isCompleted: remark.isCompleted || false
          }
        })
      )
      
      // Create new remarks using createMany for better performance
      const createRemarkPromise = remarksToCreate.length > 0
        ? tx.quotationRemark.createMany({
            data: remarksToCreate.map((remark: any) => ({
              quotationId: id,
              text: remark.text,
              isCompleted: remark.isCompleted || false
            }))
          })
        : Promise.resolve()
      
      // Execute all remark operations in parallel
      await Promise.all([...updateRemarkPromises, createRemarkPromise])

      // Delete removed remarks
      await tx.quotationRemark.deleteMany({
        where: {
          quotationId: id,
          id: { notIn: Array.from(incomingRemarkIds).filter((id): id is string => typeof id === 'string') }
        }
      })

      // Return updated quotation with relations
      return tx.quotation.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              details: true
            }
          },
          remarks: true
        }
      })
    })

    return NextResponse.json(quotation)
  } catch (error) {
    console.error("Error updating quotation:", error)
    return NextResponse.json(
      { error: "Failed to update quotation" },
      { status: 500 }
    )
  }
}

// DELETE quotation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Delete the quotation
    await prisma.quotation.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting quotation:", error)
    return NextResponse.json(
      { error: "Failed to delete quotation" },
      { status: 500 }
    )
  }
}

