import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper function to format date for ICS (YYYYMMDDTHHMMSSZ)
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

// Helper function to escape ICS text
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

// GET ICS calendar feed
export async function GET() {
  try {
    // Get events for the next 12 months
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 1) // Include last month
    
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 12) // Next 12 months

    // Fetch accepted quotations
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
        billTo: true,
        updatedAt: true,
      },
      orderBy: {
        productionDate: "asc"
      }
    })

    // Fetch Paragon tickets (finalized status)
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
        billTo: true,
        updatedAt: true,
      }
    })

    // Fetch Erha tickets (finalized status)
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
        billTo: true,
        updatedAt: true,
      }
    })

    // Generate ICS content
    const now = new Date()
    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Master Dashboard//Production Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Production Schedule',
      'X-WR-TIMEZONE:Asia/Jakarta',
      'X-WR-CALDESC:Production schedule from Master Dashboard',
    ]

    // Add quotation events
    quotations.forEach(q => {
      const eventStart = new Date(q.productionDate)
      const eventEnd = new Date(q.productionDate)
      eventEnd.setHours(23, 59, 59)

      const summary = `🎬 ${escapeICSText(q.companyName)}`
      const description = [
        `Type: Quotation`,
        `ID: ${q.quotationId}`,
        `Company: ${q.companyName}`,
        `Bill To: ${q.billTo}`,
        `Amount: ${formatCurrency(q.totalAmount)}`,
      ].filter(Boolean).join('\\n')

      icsLines.push(
        'BEGIN:VEVENT',
        `UID:quotation-${q.id}@master-dashboard`,
        `DTSTAMP:${formatICSDate(now)}`,
        `DTSTART;VALUE=DATE:${eventStart.toISOString().split('T')[0].replace(/-/g, '')}`,
        `DTEND;VALUE=DATE:${eventEnd.toISOString().split('T')[0].replace(/-/g, '')}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LAST-MODIFIED:${formatICSDate(new Date(q.updatedAt))}`,
        `CATEGORIES:Production,Quotation`,
        `STATUS:CONFIRMED`,
        'END:VEVENT'
      )
    })

    // Add Paragon ticket events
    paragonTickets.forEach(t => {
      const eventStart = new Date(t.productionDate)
      const eventEnd = new Date(t.productionDate)
      eventEnd.setHours(23, 59, 59)

      const summary = `🏥 Paragon - ${escapeICSText(t.companyName)}`
      const description = [
        `Type: Paragon Ticket`,
        `ID: ${t.ticketId}`,
        `Company: ${t.companyName}`,
        `Bill To: ${t.billTo}`,
        `Amount: ${formatCurrency(t.totalAmount)}`,
      ].filter(Boolean).join('\\n')

      icsLines.push(
        'BEGIN:VEVENT',
        `UID:paragon-${t.id}@master-dashboard`,
        `DTSTAMP:${formatICSDate(now)}`,
        `DTSTART;VALUE=DATE:${eventStart.toISOString().split('T')[0].replace(/-/g, '')}`,
        `DTEND;VALUE=DATE:${eventEnd.toISOString().split('T')[0].replace(/-/g, '')}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LAST-MODIFIED:${formatICSDate(new Date(t.updatedAt))}`,
        `CATEGORIES:Production,Paragon`,
        `STATUS:CONFIRMED`,
        'END:VEVENT'
      )
    })

    // Add Erha ticket events
    erhaTickets.forEach(t => {
      const eventStart = new Date(t.productionDate)
      const eventEnd = new Date(t.productionDate)
      eventEnd.setHours(23, 59, 59)

      const summary = `💆 Erha - ${escapeICSText(t.companyName)}`
      const description = [
        `Type: Erha Ticket`,
        `ID: ${t.ticketId}`,
        `Company: ${t.companyName}`,
        `Bill To: ${t.billTo}`,
        `Amount: ${formatCurrency(t.totalAmount)}`,
      ].filter(Boolean).join('\\n')

      icsLines.push(
        'BEGIN:VEVENT',
        `UID:erha-${t.id}@master-dashboard`,
        `DTSTAMP:${formatICSDate(now)}`,
        `DTSTART;VALUE=DATE:${eventStart.toISOString().split('T')[0].replace(/-/g, '')}`,
        `DTEND;VALUE=DATE:${eventEnd.toISOString().split('T')[0].replace(/-/g, '')}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LAST-MODIFIED:${formatICSDate(new Date(t.updatedAt))}`,
        `CATEGORIES:Production,Erha`,
        `STATUS:CONFIRMED`,
        'END:VEVENT'
      )
    })

    icsLines.push('END:VCALENDAR')

    const icsContent = icsLines.join('\r\n')

    // Return ICS file with proper headers
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="production-calendar.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error("Error generating ICS calendar:", error)
    return NextResponse.json(
      { error: "Failed to generate calendar feed" },
      { status: 500 }
    )
  }
}
