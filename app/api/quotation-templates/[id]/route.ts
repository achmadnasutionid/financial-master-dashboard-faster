import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET single template
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.quotationTemplate.findUnique({
      where: {
        id: params.id,
        deletedAt: null
      },
      include: {
        items: {
          include: {
            details: true
          }
        }
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error fetching template:", error)
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    )
  }
}

// PUT update template
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Delete existing items and remarks, then recreate
    await prisma.quotationTemplate.update({
      where: { id: params.id },
      data: {
        items: {
          deleteMany: {}
        }
      }
    })

    // Update template with new data
    const template = await prisma.quotationTemplate.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description || null,
        items: {
          create: body.items?.map((item: any) => ({
            productName: item.productName,
            details: {
              create: item.details?.map((detail: any) => ({
                detail: detail.detail,
                unitPrice: parseFloat(detail.unitPrice),
                qty: parseFloat(detail.qty)
              })) || []
            }
          })) || []
        }
      },
      include: {
        items: {
          include: {
            details: true
          }
        }
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error updating template:", error)
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    )
  }
}

// DELETE soft delete template
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.quotationTemplate.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting template:", error)
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    )
  }
}
