import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateId } from "@/lib/id-generator"

// POST - Create expense from invoice when marked as paid
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params

    // Fetch the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: {
          include: {
            details: true
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Check if invoice is paid
    if (invoice.status !== "paid") {
      return NextResponse.json(
        { error: "Only paid invoices can create expenses" },
        { status: 400 }
      )
    }

    // Check if expense already exists for this invoice (using snapshot field)
    const existingExpense = await prisma.expense.findFirst({
      where: { invoiceNumber: invoice.invoiceId }
    })

    if (existingExpense) {
      return NextResponse.json(
        { expense: existingExpense },
        { status: 200 }
      )
    }

    // Generate Expense ID using centralized generator (prevents race conditions)
    const expenseId = await generateId('EXP', 'expense')

    // Get planning data if invoice has planning reference
    let planningItems: any[] = []
    let planningData: any = null
    if (invoice.planningId) {
      planningData = await prisma.planning.findUnique({
        where: { id: invoice.planningId },
        include: {
          items: true
        }
      })
      if (planningData) {
        planningItems = planningData.items
      }
    }

    // Create expense items from invoice items
    // If planning exists, use planning expense values; otherwise use 0 for actual
    const expenseItems = invoice.items.map((invoiceItem) => {
      const planningItem = planningItems.find(
        (pi) => pi.productName === invoiceItem.productName
      )

      return {
        productName: invoiceItem.productName,
        budgeted: invoiceItem.total,
        actual: planningItem ? planningItem.expense : 0, // Pre-fill from planning if available, otherwise 0
        difference: planningItem
          ? invoiceItem.total - planningItem.expense
          : invoiceItem.total
      }
    })

    // Create expense with SNAPSHOT data (no FK relationships)
    const expense = await prisma.expense.create({
      data: {
        expenseId,
        // Keep old IDs for backward compatibility / queries
        invoiceId,
        planningId: invoice.planningId,
        // NEW: Snapshot fields for invoice
        invoiceNumber: invoice.invoiceId,
        invoiceProductionDate: invoice.productionDate,
        invoiceTotalAmount: invoice.totalAmount,
        invoicePaidDate: invoice.paidDate,
        // NEW: Snapshot fields for planning
        planningNumber: planningData?.planningId || null,
        planningClientName: planningData?.clientName || null,
        // Expense data
        projectName: invoice.billTo,
        productionDate: invoice.productionDate,
        clientBudget: planningData?.clientBudget || 0,
        paidAmount: invoice.totalAmount,
        notes: invoice.notes,
        status: "draft",
        items: {
          create: expenseItems
        }
      },
      include: {
        items: true
      }
    })

    // Update invoice with generated expense ID
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { generatedExpenseId: expense.id }
    })

    // Create or Update Tracker entry
    try {
      // Check if a tracker already exists with the same project name
      const existingTracker = await prisma.productionTracker.findFirst({
        where: {
          projectName: invoice.billTo,
          deletedAt: null
        }
      })

      // Calculate subtotal from invoice items (sum of all items before PPH)
      const subtotal = Math.round(invoice.items.reduce((sum, item) => sum + item.total, 0))
      const totalAmount = Math.round(invoice.totalAmount)

      if (existingTracker) {
        // Update existing tracker - keep existing product amounts, only update financial data
        const existingProductAmounts = (existingTracker.productAmounts as Record<string, number>) || {}
        
        // Calculate expense from existing product amounts
        const expenseProducts = ['PROPS/SET', 'VIDEOGRAPHER', 'RETOUCHER', 'MUA HAIR', 'MODEL/HANDMODEL', 'STUDIO/LIGHTING', 'FASHION STYLIST', 'GRAFFER', 'MANAGER', 'FOOD & DRINK', 'ACCOMMODATION', 'PRINT']
        const calculatedExpense = expenseProducts.reduce((sum, product) => {
          return sum + (existingProductAmounts[product] || 0)
        }, 0)

        // Recalculate PHOTOGRAPHER from new Total - existing Expense
        existingProductAmounts['PHOTOGRAPHER'] = totalAmount - calculatedExpense

        await prisma.productionTracker.update({
          where: { id: existingTracker.id },
          data: {
            expenseId: expense.expenseId,
            invoiceId: invoice.invoiceId,
            date: invoice.productionDate,
            subtotal: subtotal,
            totalAmount: totalAmount,
            expense: calculatedExpense,
            productAmounts: existingProductAmounts,
            notes: invoice.notes
          }
        })
      } else {
        // Create new tracker
        const trackerId = await generateId('PT', 'productionTracker')
        
        // Convert expense items to productAmounts object
        const productAmounts: Record<string, number> = {}
        expenseItems.forEach(item => {
          productAmounts[item.productName] = Math.round(item.actual)
        })

      // Calculate expense (sum of all products except PHOTOGRAPHER)
      const expenseProducts = ['PROPS/SET', 'VIDEOGRAPHER', 'RETOUCHER', 'MUA HAIR', 'MODEL/HANDMODEL', 'STUDIO/LIGHTING', 'FASHION STYLIST', 'GRAFFER', 'MANAGER', 'FOOD & DRINK', 'ACCOMMODATION', 'PRINT']
        const calculatedExpense = expenseProducts.reduce((sum, product) => {
          return sum + (productAmounts[product] || 0)
        }, 0)

        // Calculate PHOTOGRAPHER from Total - Expense
        const calculatedPhotographer = totalAmount - calculatedExpense
        productAmounts['PHOTOGRAPHER'] = calculatedPhotographer

        await prisma.productionTracker.create({
          data: {
            trackerId,
            expenseId: expense.expenseId,
            invoiceId: invoice.invoiceId,
            projectName: invoice.billTo,
            date: invoice.productionDate,
            subtotal: subtotal,
            totalAmount: totalAmount,
            expense: calculatedExpense,
            productAmounts,
            notes: invoice.notes,
            status: "pending"
          }
        })
      }
    } catch (error) {
      console.error("Error creating/updating production tracker:", error)
      // Don't fail the whole operation if tracker creation fails
    }

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error("Error creating expense:", error)
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    )
  }
}

