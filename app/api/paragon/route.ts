import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET all paragon tickets
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const sortBy = searchParams.get("sortBy")

    const where = status ? { status } : {}
    const orderBy = sortBy === "oldest" ? { createdAt: "asc" as const } : { createdAt: "desc" as const }

    const tickets = await prisma.paragonTicket.findMany({
      where,
      orderBy,
      include: {
        items: {
          include: {
            details: true
          }
        },
        remarks: true
      }
    })

    return NextResponse.json(tickets)
  } catch (error) {
    console.error("Error fetching paragon tickets:", error)
    return NextResponse.json(
      { error: "Failed to fetch paragon tickets" },
      { status: 500 }
    )
  }
}

// Helper to extract number from ID (e.g., "PRG-2024-0001" -> 1)
function extractIdNumber(id: string | null | undefined): number {
  if (!id) return 0
  const parts = id.split("-")
  const num = parseInt(parts[2])
  return isNaN(num) ? 0 : num
}

// POST create new paragon ticket
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const year = new Date().getFullYear()

    // Use transaction for atomic ID generation and creation
    const ticket = await prisma.$transaction(async (tx) => {
      // Fetch all latest IDs in parallel for better performance
      const [
        latestTicket,
        latestQuotation,
        latestParagonQuotation,
        latestErhaQuotation,
        latestInvoice,
        latestParagonInvoice,
        latestErhaInvoice
      ] = await Promise.all([
        tx.paragonTicket.findFirst({
          where: { ticketId: { startsWith: `PRG-${year}-` } },
          orderBy: { ticketId: "desc" },
          select: { ticketId: true }
        }),
        tx.quotation.findFirst({
          where: { quotationId: { startsWith: `QTN-${year}-` } },
          orderBy: { quotationId: "desc" },
          select: { quotationId: true }
        }),
        tx.paragonTicket.findFirst({
          where: { quotationId: { startsWith: `QTN-${year}-`, not: "" } },
          orderBy: { quotationId: "desc" },
          select: { quotationId: true }
        }),
        tx.erhaTicket.findFirst({
          where: { quotationId: { startsWith: `QTN-${year}-`, not: "" } },
          orderBy: { quotationId: "desc" },
          select: { quotationId: true }
        }),
        tx.invoice.findFirst({
          where: { invoiceId: { startsWith: `INV-${year}-` } },
          orderBy: { invoiceId: "desc" },
          select: { invoiceId: true }
        }),
        tx.paragonTicket.findFirst({
          where: { invoiceId: { startsWith: `INV-${year}-`, not: "" } },
          orderBy: { invoiceId: "desc" },
          select: { invoiceId: true }
        }),
        tx.erhaTicket.findFirst({
          where: { invoiceId: { startsWith: `INV-${year}-`, not: "" } },
          orderBy: { invoiceId: "desc" },
          select: { invoiceId: true }
        })
      ])

      // Calculate next IDs
      const nextTicketNum = extractIdNumber(latestTicket?.ticketId) + 1
      const nextQuotationNum = Math.max(
        extractIdNumber(latestQuotation?.quotationId),
        extractIdNumber(latestParagonQuotation?.quotationId),
        extractIdNumber(latestErhaQuotation?.quotationId)
      ) + 1
      const nextInvoiceNum = Math.max(
        extractIdNumber(latestInvoice?.invoiceId),
        extractIdNumber(latestParagonInvoice?.invoiceId),
        extractIdNumber(latestErhaInvoice?.invoiceId)
      ) + 1

      const ticketId = `PRG-${year}-${nextTicketNum.toString().padStart(4, "0")}`
      const quotationId = `QTN-${year}-${nextQuotationNum.toString().padStart(4, "0")}`
      const invoiceId = `INV-${year}-${nextInvoiceNum.toString().padStart(4, "0")}`

      // For drafts, provide defaults for required fields if not provided
      const isDraft = body.status === "draft"

      // Create ticket atomically
      return tx.paragonTicket.create({
        data: {
          ticketId,
          quotationId,
          invoiceId,
          companyName: body.companyName || (isDraft ? "" : body.companyName),
          companyAddress: body.companyAddress || (isDraft ? "" : body.companyAddress),
          companyCity: body.companyCity || (isDraft ? "" : body.companyCity),
          companyProvince: body.companyProvince || (isDraft ? "" : body.companyProvince),
          companyPostalCode: body.companyPostalCode || null,
          companyTelp: body.companyTelp || null,
          companyEmail: body.companyEmail || null,
          productionDate: body.productionDate ? new Date(body.productionDate) : new Date(),
          quotationDate: body.quotationDate ? new Date(body.quotationDate) : new Date(),
          invoiceBastDate: body.invoiceBastDate ? new Date(body.invoiceBastDate) : new Date(),
          billTo: body.billTo || (isDraft ? "" : body.billTo),
          contactPerson: body.contactPerson || (isDraft ? "" : body.contactPerson),
          contactPosition: body.contactPosition || (isDraft ? "" : body.contactPosition),
          signatureName: body.signatureName || (isDraft ? "" : body.signatureName),
          signatureRole: body.signatureRole || null,
          signatureImageData: body.signatureImageData || (isDraft ? "" : body.signatureImageData),
          finalWorkImageData: body.finalWorkImageData || null,
          pph: body.pph || (isDraft ? "" : body.pph),
          totalAmount: body.totalAmount ? parseFloat(body.totalAmount) : 0,
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
          }
        },
        include: {
          items: { include: { details: true } },
          remarks: true
        }
      })
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error("Error creating paragon ticket:", error)
    return NextResponse.json(
      { error: "Failed to create paragon ticket" },
      { status: 500 }
    )
  }
}

