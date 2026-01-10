import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET all quotation templates
export async function GET() {
  try {
    const templates = await prisma.quotationTemplate.findMany({
      where: {
        deletedAt: null
      },
      include: {
        items: {
          include: {
            details: true
          }
        },
        remarks: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error fetching quotation templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch quotation templates" },
      { status: 500 }
    )
  }
}

// POST create new quotation template
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Create template with items and details
    const template = await prisma.quotationTemplate.create({
      data: {
        name: body.name,
        description: body.description || null,
        pph: body.pph,
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
        },
        remarks: {
          create: body.remarks?.map((remark: any) => ({
            text: remark.text
          })) || []
        }
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

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error("Error creating quotation template:", error)
    return NextResponse.json(
      { error: "Failed to create quotation template" },
      { status: 500 }
    )
  }
}
