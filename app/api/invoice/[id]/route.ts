import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET single invoice
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            details: true
          },
          orderBy: { order: 'asc' }
        },
        remarks: {
          orderBy: { order: 'asc' }
        },
        signatures: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    )
  }
}

// PUT update invoice (Optimized with UPSERT pattern)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // If only status is provided, just update the status (for marking invoice as paid)
    if (body.status && Object.keys(body).length === 1) {
      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          status: body.status
        },
        include: {
          items: {
            include: {
              details: true
            }
          }
        }
      })
      
      return NextResponse.json(invoice)
    }

    // Use transaction for atomic updates with UPSERT pattern
    const invoice = await prisma.$transaction(async (tx) => {
      // Calculate paidDate if needed
      let paidDate = body.paidDate ? new Date(body.paidDate) : null
      
      // Update main invoice data
      const updated = await tx.invoice.update({
        where: { id },
        data: {
          companyName: body.companyName,
          companyAddress: body.companyAddress,
          companyCity: body.companyCity,
          companyProvince: body.companyProvince,
          companyPostalCode: body.companyPostalCode || null,
          companyTelp: body.companyTelp || null,
          companyEmail: body.companyEmail || null,
          productionDate: new Date(body.productionDate),
          paidDate: paidDate,
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
          summaryOrder: body.summaryOrder || "subtotal,pph,total",
          status: body.status || "draft",
        }
      })

      // Get existing item IDs from database
      const existingItems = await tx.invoiceItem.findMany({
        where: { invoiceId: id },
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
      // Process items in order, preserving their position from the frontend
      const itemsWithOrder = (body.items || []).map((item: any, index: number) => ({
        ...item,
        order: index
      }))
      
      // Separate items into update vs create batches
      const itemsToUpdate = itemsWithOrder.filter((item: any) => item.id && existingItemIds.has(item.id))
      const itemsToCreate = itemsWithOrder.filter((item: any) => !item.id || !existingItemIds.has(item.id))
      
      // Collect all details to be deleted for updated items
      const itemIdsToDeleteDetails = itemsToUpdate.map((item: any) => item.id)
      
      // Step 1: Update all existing items in parallel
      const updatePromises = itemsToUpdate.map((item: any) =>
        tx.invoiceItem.update({
          where: { id: item.id },
          data: {
            productName: item.productName,
            total: parseFloat(item.total),
            order: item.order
          }
        })
      )
      
      // Step 2: Delete all old details for updated items (single query)
      const deleteDetailsPromise = itemIdsToDeleteDetails.length > 0
        ? tx.invoiceItemDetail.deleteMany({
            where: { invoiceItemId: { in: itemIdsToDeleteDetails } }
          })
        : Promise.resolve()
      
      // Step 3: Create new items with details in parallel
      const createItemResults = await Promise.all(
        itemsToCreate.map((item: any) =>
          tx.invoiceItem.create({
            data: {
              invoiceId: id,
              productName: item.productName,
              total: parseFloat(item.total),
              order: item.order,
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
          invoiceItemId: item.id,
          detail: detail.detail,
          unitPrice: parseFloat(detail.unitPrice),
          qty: parseFloat(detail.qty),
          amount: parseFloat(detail.amount)
        }))
      )
      
      if (allNewDetails.length > 0) {
        await tx.invoiceItemDetail.createMany({
          data: allNewDetails
        })
      }

      // Delete removed items (items not in incoming data AND not just created)
      // Combine existing item IDs from frontend with newly created IDs
      const allKeptItemIds = [
        ...Array.from(incomingItemIds).filter((id): id is string => typeof id === 'string' && existingItemIds.has(id)),
        ...newlyCreatedItemIds
      ]
      
      await tx.invoiceItem.deleteMany({
        where: {
          invoiceId: id,
          id: { notIn: allKeptItemIds }
        }
      })

      // Get existing remark IDs from database
      const existingRemarks = await tx.invoiceRemark.findMany({
        where: { invoiceId: id },
        select: { id: true }
      })
      const existingRemarkIds = new Set(existingRemarks.map(remark => remark.id))

      // UPSERT remarks (OPTIMIZED - batch operations)
      const remarksToUpdate = (body.remarks || []).filter((remark: any) => remark.id && existingRemarkIds.has(remark.id))
      const remarksToCreate = (body.remarks || []).filter((remark: any) => !remark.id || !existingRemarkIds.has(remark.id))
      
      // Update all existing remarks in parallel (with order)
      const updateRemarkPromises = remarksToUpdate.map((remark: any) =>
        tx.invoiceRemark.update({
          where: { id: remark.id },
          data: {
            text: remark.text,
            isCompleted: remark.isCompleted || false,
            order: (body.remarks || []).findIndex((r: any) => r.id === remark.id)
          }
        })
      )
      
      // Create new remarks using createMany for better performance (with order)
      const createRemarkPromise = remarksToCreate.length > 0
        ? tx.invoiceRemark.createMany({
            data: remarksToCreate.map((remark: any) => ({
              invoiceId: id,
              text: remark.text,
              isCompleted: remark.isCompleted || false,
              order: (body.remarks || []).findIndex((r: any) => r === remark)
            }))
          })
        : Promise.resolve()
      
      // Execute all remark operations in parallel
      await Promise.all([...updateRemarkPromises, createRemarkPromise])

      // Delete removed remarks
      await tx.invoiceRemark.deleteMany({
        where: {
          invoiceId: id,
          id: { notIn: Array.from(incomingRemarkIds).filter((id): id is string => typeof id === 'string') }
        }
      })

      // Return updated invoice with relations
      return tx.invoice.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              details: true
            },
            orderBy: { order: 'asc' }
          },
          remarks: true
        }
      })
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error updating invoice:", error)
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    )
  }
}

// DELETE invoice
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Delete the invoice
    await prisma.invoice.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    )
  }
}

