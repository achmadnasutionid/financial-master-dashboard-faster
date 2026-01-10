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

      // Collect IDs from incoming data
      const incomingItemIds = new Set(
        body.items?.map((item: any) => item.id).filter(Boolean) || []
      )
      const incomingRemarkIds = new Set(
        body.remarks?.map((remark: any) => remark.id).filter(Boolean) || []
      )

      // UPSERT items and details
      for (const item of body.items || []) {
        if (item.id && !item.id.startsWith('temp-')) {
          // Update existing item
          await tx.quotationItem.update({
            where: { id: item.id },
            data: {
              productName: item.productName,
              total: parseFloat(item.total),
            }
          })

          // Delete all existing details for this item
          await tx.quotationItemDetail.deleteMany({
            where: { quotationItemId: item.id }
          })

          // Create new details
          for (const detail of item.details || []) {
            await tx.quotationItemDetail.create({
              data: {
                quotationItemId: item.id,
                detail: detail.detail,
                unitPrice: parseFloat(detail.unitPrice),
                qty: parseFloat(detail.qty),
                amount: parseFloat(detail.amount)
              }
            })
          }
        } else {
          // Create new item with details
          await tx.quotationItem.create({
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
        }
      }

      // Delete removed items (items not in incoming data)
      await tx.quotationItem.deleteMany({
        where: {
          quotationId: id,
          id: { notIn: Array.from(incomingItemIds).filter((id): id is string => typeof id === 'string') }
        }
      })

      // UPSERT remarks
      for (const remark of body.remarks || []) {
        if (remark.id && !remark.id.startsWith('temp-')) {
          // Update existing remark
          await tx.quotationRemark.update({
            where: { id: remark.id },
            data: {
              text: remark.text,
              isCompleted: remark.isCompleted || false
            }
          })
        } else {
          // Create new remark
          await tx.quotationRemark.create({
            data: {
              quotationId: id,
              text: remark.text,
              isCompleted: remark.isCompleted || false
            }
          })
        }
      }

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

