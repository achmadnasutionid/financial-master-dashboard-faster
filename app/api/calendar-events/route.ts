import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET calendar events (accepted quotations)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    const month = searchParams.get("month")

    if (!year || !month) {
      return NextResponse.json(
        { error: "Year and month are required" },
        { status: 400 }
      )
    }

    // Get start and end of the month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)

    // Fetch accepted quotations within the date range
    const quotations = await prisma.quotation.findMany({
      where: {
        status: "accepted",
        deletedAt: null,
        productionDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        quotationId: true,
        companyName: true,
        productionDate: true,
        totalAmount: true,
        billTo: true
      },
      orderBy: {
        productionDate: "asc"
      }
    })

    // Also fetch Paragon and Erha tickets (finalized status)
    const paragonTickets = await prisma.paragonTicket.findMany({
      where: {
        status: "finalized",
        deletedAt: null,
        productionDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        ticketId: true,
        companyName: true,
        productionDate: true,
        totalAmount: true,
        billTo: true
      }
    })

    const erhaTickets = await prisma.erhaTicket.findMany({
      where: {
        status: "finalized",
        deletedAt: null,
        productionDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        ticketId: true,
        companyName: true,
        productionDate: true,
        totalAmount: true,
        billTo: true
      }
    })

    // Combine all events
    const events = [
      ...quotations.map(q => ({
        id: q.id,
        type: "quotation" as const,
        referenceId: q.quotationId,
        companyName: q.companyName,
        productionDate: q.productionDate,
        totalAmount: q.totalAmount,
        billTo: q.billTo
      })),
      ...paragonTickets.map(t => ({
        id: t.id,
        type: "paragon" as const,
        referenceId: t.ticketId,
        companyName: t.companyName,
        productionDate: t.productionDate,
        totalAmount: t.totalAmount,
        billTo: t.billTo
      })),
      ...erhaTickets.map(t => ({
        id: t.id,
        type: "erha" as const,
        referenceId: t.ticketId,
        companyName: t.companyName,
        productionDate: t.productionDate,
        totalAmount: t.totalAmount,
        billTo: t.billTo
      }))
    ]

    return NextResponse.json(events)
  } catch (error) {
    console.error("Error fetching calendar events:", error)
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    )
  }
}
