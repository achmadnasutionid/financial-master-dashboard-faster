import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateId } from "@/lib/id-generator"

// GET all quotations (optimized with pagination)
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
        { quotationId: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { billTo: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Fetch data with pagination - optimized for list view
    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        select: {
          id: true,
          quotationId: true,
          companyName: true,
          billTo: true,
          productionDate: true,
          totalAmount: true,
          status: true,
          generatedInvoiceId: true,
          createdAt: true,
          updatedAt: true,
          // Only fetch item summaries, not full details
          items: {
            select: {
              productName: true,
              total: true
            }
          }
          // Don't fetch remarks in list view
        },
        orderBy: {
          updatedAt: sortBy === "oldest" ? "asc" : "desc"
        },
        take: limit,
        skip: skip
      }),
      prisma.quotation.count({ where })
    ])

    // Return paginated response
    return NextResponse.json({
      data: quotations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching quotations:", error)
    return NextResponse.json(
      { error: "Failed to fetch quotations" },
      { status: 500 }
    )
  }
}

// POST create new quotation
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Generate unique quotation ID (optimized with cache)
    const quotationId = await generateId('QTN', 'quotation')

    // For drafts, provide defaults for required fields if not provided
    const isDraft = body.status === "draft"
    
    // Create quotation with items and details
    const quotation = await prisma.quotation.create({
      data: {
        quotationId,
        companyName: body.companyName || (isDraft ? "" : body.companyName),
        companyAddress: body.companyAddress || (isDraft ? "" : body.companyAddress),
        companyCity: body.companyCity || (isDraft ? "" : body.companyCity),
        companyProvince: body.companyProvince || (isDraft ? "" : body.companyProvince),
        companyTelp: body.companyTelp || null,
        companyEmail: body.companyEmail || null,
        productionDate: body.productionDate ? new Date(body.productionDate) : new Date(),
        billTo: body.billTo || (isDraft ? "" : body.billTo),
        notes: body.notes || null,
        billingName: body.billingName || (isDraft ? "" : body.billingName),
        billingBankName: body.billingBankName || (isDraft ? "" : body.billingBankName),
        billingBankAccount: body.billingBankAccount || (isDraft ? "" : body.billingBankAccount),
        billingBankAccountName: body.billingBankAccountName || (isDraft ? "" : body.billingBankAccountName),
        billingKtp: body.billingKtp || null,
        billingNpwp: body.billingNpwp || null,
        signatureName: body.signatureName || (isDraft ? "" : body.signatureName),
        signatureRole: body.signatureRole || null,
        signatureImageData: body.signatureImageData || (isDraft ? "" : body.signatureImageData),
        pph: body.pph || (isDraft ? "" : body.pph),
        totalAmount: body.totalAmount ? parseFloat(body.totalAmount) : 0,
        summaryOrder: body.summaryOrder || "subtotal,pph,total",
        status: body.status || "draft",
        items: {
          create: body.items?.map((item: any) => ({
            productName: item.productName || "",
            total: item.total ? parseFloat(item.total) : 0,
            details: {
              create: item.details?.map((detail: any) => ({
                detail: detail.detail || "",
                unitPrice: detail.unitPrice ? parseFloat(detail.unitPrice) : 0,
                qty: detail.qty ? parseFloat(detail.qty) : 0,
                amount: detail.amount ? parseFloat(detail.amount) : 0
              })) || []
            }
          })) || []
        },
        remarks: {
          create: body.remarks?.map((remark: any) => ({
            text: remark.text || "",
            isCompleted: remark.isCompleted || false
          })) || []
        },
        signatures: {
          create: body.customSignatures?.map((sig: any) => ({
            name: sig.name,
            position: sig.position,
            imageData: sig.imageData || "", // Empty for manual signatures
            order: sig.order
          })) || []
        }
      },
      include: {
        items: {
          include: {
            details: true
          }
        },
        remarks: true,
        signatures: true
      }
    })

    return NextResponse.json(quotation, { status: 201 })
  } catch (error) {
    console.error("Error creating quotation:", error)
    return NextResponse.json(
      { error: "Failed to create quotation" },
      { status: 500 }
    )
  }
}

