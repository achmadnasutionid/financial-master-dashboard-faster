import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateId } from "@/lib/id-generator"
import { invalidateExpenseCaches, invalidateInvoiceCaches } from "@/lib/cache-invalidation"

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

    // Check if expense already exists for this invoice (using generatedExpenseId field)
    if (invoice.generatedExpenseId) {
      const existingExpense = await prisma.expense.findUnique({
        where: { id: invoice.generatedExpenseId },
        include: { items: true }
      })
      
      if (existingExpense) {
        return NextResponse.json(
          { expense: existingExpense },
          { status: 200 }
        )
      }
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

    // Use transaction to prevent race conditions
    const expense = await prisma.$transaction(async (tx) => {
      // Double-check inside transaction that expense wasn't created by another request
      const recheck = await tx.invoice.findUnique({
        where: { id: invoiceId },
        select: { generatedExpenseId: true }
      })

      if (recheck?.generatedExpenseId) {
        // Another request already created it, fetch and return
        const existing = await tx.expense.findUnique({
          where: { id: recheck.generatedExpenseId },
          include: { items: true }
        })
        if (existing) {
          throw { isExisting: true, expense: existing }
        }
      }

      // Create expense with SNAPSHOT data (no FK relationships)
      const newExpense = await tx.expense.create({
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

      // Update invoice with generated expense ID (in same transaction)
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { generatedExpenseId: newExpense.id }
      })

      return newExpense
    })

    // Update tracker expenseId (tracker should already exist from invoice creation)
    // This happens AFTER transaction to avoid blocking
    try {
      const existingTracker = await prisma.productionTracker.findFirst({
        where: {
          projectName: invoice.billTo,
          deletedAt: null
        }
      })

      if (existingTracker) {
        // Update tracker with expenseId
        await prisma.productionTracker.update({
          where: { id: existingTracker.id },
          data: {
            expenseId: expense.expenseId
          }
        })
      }
    } catch (error) {
      console.error("Error updating tracker expenseId:", error)
      // Don't fail expense creation if tracker update fails
    }

    // Invalidate caches for both expense and invoice
    await Promise.all([
      invalidateExpenseCaches(expense.id),
      invalidateInvoiceCaches(invoiceId)
    ])

    return NextResponse.json(expense, { status: 201 })
  } catch (error: any) {
    // Handle case where expense was created by concurrent request
    if (error?.isExisting && error?.expense) {
      return NextResponse.json(error.expense, { status: 200 })
    }
    
    console.error("Error creating expense:", error)
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    )
  }
}

