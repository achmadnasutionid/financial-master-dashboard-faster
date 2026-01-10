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
          }
        },
        remarks: true
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
          await tx.invoiceItem.update({
            where: { id: item.id },
            data: {
              productName: item.productName,
              total: parseFloat(item.total),
            }
          })

          // Delete all existing details for this item
          await tx.invoiceItemDetail.deleteMany({
            where: { invoiceItemId: item.id }
          })

          // Create new details
          for (const detail of item.details || []) {
            await tx.invoiceItemDetail.create({
              data: {
                invoiceItemId: item.id,
                detail: detail.detail,
                unitPrice: parseFloat(detail.unitPrice),
                qty: parseFloat(detail.qty),
                amount: parseFloat(detail.amount)
              }
            })
          }
        } else {
          // Create new item with details
          await tx.invoiceItem.create({
            data: {
              invoiceId: id,
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

      // Delete removed items
      await tx.invoiceItem.deleteMany({
        where: {
          invoiceId: id,
          id: { notIn: Array.from(incomingItemIds).filter((id): id is string => typeof id === 'string') }
        }
      })

      // UPSERT remarks
      for (const remark of body.remarks || []) {
        if (remark.id && !remark.id.startsWith('temp-')) {
          // Update existing remark
          await tx.invoiceRemark.update({
            where: { id: remark.id },
            data: {
              text: remark.text,
              isCompleted: remark.isCompleted || false
            }
          })
        } else {
          // Create new remark
          await tx.invoiceRemark.create({
            data: {
              invoiceId: id,
              text: remark.text,
              isCompleted: remark.isCompleted || false
            }
          })
        }
      }

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
            }
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

