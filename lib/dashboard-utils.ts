import type {
  Invoice,
  Quotation,
  Expense,
  Product,
  GearExpense,
  BigExpense,
  Planning,
  InvoiceStats,
  QuotationStats,
  ExpenseStats,
  ExtraExpenses,
  MonthlyTrend,
  ProductExpense,
  ActionItems,
  RecentActivity,
  ThisMonthSummary,
} from "@/types"

/**
 * Calculate invoice and quotation statistics
 */
export function calculateStats(
  invoices: Invoice[],
  quotations: Quotation[],
  year: string
): { invoiceStats: InvoiceStats; quotationStats: QuotationStats } {
  // Filter by year if not "all"
  const filteredInvoices =
    year === "all"
      ? invoices
      : invoices.filter(
          (inv) =>
            inv.productionDate &&
            new Date(inv.productionDate).getFullYear().toString() === year
        )

  const filteredQuotations =
    year === "all"
      ? quotations
      : quotations.filter(
          (q) =>
            q.productionDate &&
            new Date(q.productionDate).getFullYear().toString() === year
        )

  // Calculate invoice totals
  const invoiceTotal = filteredInvoices
    .filter((inv) => inv.status !== "draft")
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
  const invoicePending = filteredInvoices
    .filter((inv) => inv.status === "pending")
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
  const invoicePaid = filteredInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
  const invoiceDraftCount = filteredInvoices.filter(
    (inv) => inv.status === "draft"
  ).length

  // Calculate quotation totals
  const quotationTotal = filteredQuotations
    .filter((q) => q.status !== "draft")
    .reduce((sum, q) => sum + (q.totalAmount || 0), 0)
  const quotationPending = filteredQuotations
    .filter((q) => q.status === "pending")
    .reduce((sum, q) => sum + (q.totalAmount || 0), 0)
  const quotationAccepted = filteredQuotations
    .filter((q) => q.status === "accepted")
    .reduce((sum, q) => sum + (q.totalAmount || 0), 0)
  const quotationDraftCount = filteredQuotations.filter(
    (q) => q.status === "draft"
  ).length

  return {
    invoiceStats: {
      total: invoiceTotal,
      draft: invoiceDraftCount,
      pending: invoicePending,
      paid: invoicePaid,
    },
    quotationStats: {
      total: quotationTotal,
      draft: quotationDraftCount,
      pending: quotationPending,
      accepted: quotationAccepted,
    },
  }
}

/**
 * Calculate expense statistics
 */
export function calculateExpenseStats(
  expenses: Expense[],
  year: string
): ExpenseStats {
  const filteredExpenses =
    year === "all"
      ? expenses
      : expenses.filter(
          (exp) =>
            exp.productionDate &&
            new Date(exp.productionDate).getFullYear().toString() === year
        )

  const finalExpenses = filteredExpenses.filter((exp) => exp.status === "final")

  let totalUnderBudget = 0
  let totalOverBudget = 0
  let totalEfficiency = 0
  let countWithPaid = 0
  let grossProfit = 0
  let totalActualExpenses = 0

  finalExpenses.forEach((exp) => {
    const totalPaid = exp.paidAmount || 0
    const totalActual = exp.items.reduce((sum, item) => sum + item.actual, 0)
    const difference = totalPaid - totalActual

    grossProfit += totalPaid
    totalActualExpenses += totalActual

    if (difference >= 0) {
      totalUnderBudget += difference
    } else {
      totalOverBudget += Math.abs(difference)
    }

    if (totalPaid > 0) {
      const efficiency = (difference / totalPaid) * 100
      totalEfficiency += efficiency
      countWithPaid++
    }
  })

  const netProfit = grossProfit - totalActualExpenses
  const marginPercentage = grossProfit > 0 ? (netProfit / grossProfit) * 100 : 0

  return {
    totalUnderBudget,
    totalOverBudget,
    averageEfficiency: countWithPaid > 0 ? totalEfficiency / countWithPaid : 0,
    grossProfit,
    netProfit,
    marginPercentage,
  }
}

/**
 * Calculate extra expenses (gear and big expenses)
 */
export function calculateExtraExpenses(
  gearExpenses: GearExpense[],
  bigExpenses: BigExpense[],
  year: string
): ExtraExpenses {
  const filteredGear =
    year === "all"
      ? gearExpenses
      : gearExpenses.filter((exp) => exp.year.toString() === year)

  const filteredBig =
    year === "all"
      ? bigExpenses
      : bigExpenses.filter((exp) => exp.year.toString() === year)

  const gearTotal = filteredGear.reduce((sum, exp) => sum + (exp.amount || 0), 0)
  const bigTotal = filteredBig.reduce((sum, exp) => sum + (exp.amount || 0), 0)

  return { gearTotal, bigTotal }
}

/**
 * Calculate monthly trends
 */
export function calculateMonthlyTrends(
  expenses: Expense[],
  year: string
): MonthlyTrend[] {
  const filteredExpenses =
    year === "all"
      ? expenses.filter((exp) => exp.status === "final")
      : expenses.filter((exp) => {
          if (!exp.productionDate) return false
          const expYear = new Date(exp.productionDate).getFullYear().toString()
          return expYear === year && exp.status === "final"
        })

  const monthlyData: { [key: number]: MonthlyTrend } = {}
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]

  months.forEach((month, index) => {
    monthlyData[index + 1] = {
      month,
      grossProfit: 0,
      netProfit: 0,
      projectCount: 0,
      totalInvoiceValue: 0,
      averageValue: 0,
    }
  })

  filteredExpenses.forEach((exp) => {
    const month = exp.productionDate
      ? new Date(exp.productionDate).getMonth() + 1
      : new Date(exp.createdAt).getMonth() + 1

    const totalPaid = exp.paidAmount || 0
    const totalActual = exp.items.reduce((sum, item) => sum + item.actual, 0)
    const difference = totalPaid - totalActual

    monthlyData[month].grossProfit += totalPaid / 1000000
    monthlyData[month].netProfit += difference / 1000000
    monthlyData[month].projectCount += 1
    monthlyData[month].totalInvoiceValue += totalPaid
  })

  Object.keys(monthlyData).forEach((monthKey) => {
    const data = monthlyData[parseInt(monthKey)]
    data.averageValue =
      data.projectCount > 0 ? data.totalInvoiceValue / data.projectCount / 1000000 : 0
  })

  return Object.values(monthlyData)
}

/**
 * Calculate product expenses
 */
export function calculateProductExpenses(
  expenses: Expense[],
  products: Product[],
  year: string
): { productExpenses: ProductExpense[]; etcExpenses: ProductExpense[] } {
  const filteredExpenses =
    year === "all"
      ? expenses.filter((exp) => exp.status === "final")
      : expenses.filter((exp) => {
          if (!exp.productionDate) return false
          const expYear = new Date(exp.productionDate).getFullYear().toString()
          return expYear === year && exp.status === "final"
        })

  // Exclude "PHOTOGRAPHER" from master products
  const masterProductNames = products
    .filter((p) => p.name.toUpperCase() !== "PHOTOGRAPHER")
    .map((p) => p.name)
  const productTotals: { [key: string]: number } = {}
  const etcTotals: { [key: string]: number } = {}

  filteredExpenses.forEach((exp) => {
    exp.items.forEach((item) => {
      const actual = item.actual || 0
      const productName = item.productName

      // Skip PHOTOGRAPHER items entirely
      if (productName.toUpperCase() === "PHOTOGRAPHER") {
        return
      }

      if (masterProductNames.includes(productName)) {
        productTotals[productName] = (productTotals[productName] || 0) + actual
      } else {
        etcTotals[productName] = (etcTotals[productName] || 0) + actual
      }
    })
  })

  const productArray = Object.entries(productTotals)
    .map(([name, amount]) => ({
      name,
      amount: amount / 1000000,
      percentage: 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  const etcArray = Object.entries(etcTotals)
    .map(([name, amount]) => ({
      name,
      amount: amount / 1000000,
      percentage: 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  const totalProductExpense = productArray.reduce((sum, p) => sum + p.amount, 0)
  const totalEtcExpense = etcArray.reduce((sum, p) => sum + p.amount, 0)

  productArray.forEach((p) => {
    p.percentage = totalProductExpense > 0 ? (p.amount / totalProductExpense) * 100 : 0
  })

  etcArray.forEach((p) => {
    p.percentage = totalEtcExpense > 0 ? (p.amount / totalEtcExpense) * 100 : 0
  })

  return { productExpenses: productArray, etcExpenses: etcArray }
}

/**
 * Calculate action items
 */
export function calculateActionItems(
  invoices: Invoice[],
  quotations: Quotation[],
  expenses: Expense[]
): ActionItems {
  const pendingInvoicesList = invoices.filter((inv) => inv.status === "pending")
  const pendingInvoicesTotal = pendingInvoicesList.reduce(
    (sum, inv) => sum + (inv.totalAmount || 0),
    0
  )

  const now = new Date().getTime()
  const pendingQuotationsList = quotations
    .filter((q) => q.status === "pending")
    .map((q) => {
      const updatedDate = q.updatedAt
        ? new Date(q.updatedAt).getTime()
        : new Date(q.createdAt).getTime()
      const days = Math.floor((now - updatedDate) / (1000 * 60 * 60 * 24))
      return {
        ...q,
        daysSinceUpdate: isNaN(days) ? 0 : days,
      }
    })
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)

  const draftExpensesCount = expenses.filter((exp) => exp.status === "draft").length

  return {
    pendingInvoices: {
      count: pendingInvoicesList.length,
      totalAmount: pendingInvoicesTotal,
      items: pendingInvoicesList,
    },
    pendingQuotations: {
      count: pendingQuotationsList.length,
      items: pendingQuotationsList,
    },
    draftExpenses: {
      count: draftExpensesCount,
    },
  }
}

/**
 * Calculate recent activities
 */
export function calculateRecentActivities(
  invoices: Invoice[],
  quotations: Quotation[],
  expenses: Expense[],
  planning: Planning[]
): RecentActivity[] {
  const activities: RecentActivity[] = []

  invoices.forEach((inv) => {
    const updatedAt = new Date(inv.updatedAt)
    activities.push({
      type: "invoice",
      id: inv.id,
      displayId: inv.invoiceId,
      action:
        inv.status === "paid"
          ? "marked as PAID"
          : inv.status === "pending"
          ? "set to PENDING"
          : "created",
      timestamp: updatedAt.getTime(),
      date: updatedAt.toISOString(),
      icon: "receipt",
      color:
        inv.status === "paid"
          ? "green"
          : inv.status === "pending"
          ? "blue"
          : "yellow",
    })
  })

  quotations.forEach((q) => {
    const updatedAt = new Date(q.updatedAt)
    activities.push({
      type: "quotation",
      id: q.id,
      displayId: q.quotationId,
      action:
        q.status === "accepted"
          ? "marked as ACCEPTED"
          : q.status === "pending"
          ? "set to PENDING"
          : "created",
      timestamp: updatedAt.getTime(),
      date: updatedAt.toISOString(),
      icon: "file-check",
      color:
        q.status === "accepted"
          ? "green"
          : q.status === "pending"
          ? "yellow"
          : "gray",
    })
  })

  expenses.forEach((exp) => {
    const updatedAt = new Date(exp.updatedAt)
    activities.push({
      type: "expense",
      id: exp.id,
      displayId: exp.expenseId,
      action: exp.status === "final" ? "finalized" : "created",
      timestamp: updatedAt.getTime(),
      date: updatedAt.toISOString(),
      icon: "wallet",
      color: exp.status === "final" ? "green" : "orange",
    })
  })

  planning.forEach((plan) => {
    const updatedAt = new Date(plan.updatedAt)
    activities.push({
      type: "planning",
      id: plan.id,
      displayId: plan.planningId,
      action: plan.status === "final" ? "finalized" : "created",
      timestamp: updatedAt.getTime(),
      date: updatedAt.toISOString(),
      icon: "calendar",
      color: plan.status === "final" ? "green" : "gray",
    })
  })

  return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 6)
}

/**
 * Calculate this month summary
 */
export function calculateThisMonthSummary(
  invoices: Invoice[],
  expenses: Expense[]
): ThisMonthSummary {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

  const thisMonthPaidInvoices = invoices.filter((inv) => {
    if (inv.status !== "paid") return false
    const invDate = new Date(inv.updatedAt)
    return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear
  })
  const thisMonthRevenue = thisMonthPaidInvoices.reduce(
    (sum, inv) => sum + (inv.totalAmount || 0),
    0
  )

  const lastMonthPaidInvoices = invoices.filter((inv) => {
    if (inv.status !== "paid") return false
    const invDate = new Date(inv.updatedAt)
    return invDate.getMonth() === lastMonth && invDate.getFullYear() === lastMonthYear
  })
  const lastMonthRevenue = lastMonthPaidInvoices.reduce(
    (sum, inv) => sum + (inv.totalAmount || 0),
    0
  )

  const thisMonthExpenses = expenses.filter((exp) => {
    if (exp.status !== "final") return false
    const expDate = new Date(exp.updatedAt)
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear
  })
  const thisMonthTotalPaid = thisMonthExpenses.reduce(
    (sum, exp) => sum + (exp.paidAmount || 0),
    0
  )
  const thisMonthActualExpenses = thisMonthExpenses.reduce((sum, exp) => {
    return sum + exp.items.reduce((itemSum, item) => itemSum + item.actual, 0)
  }, 0)
  const thisMonthNetProfit = thisMonthTotalPaid - thisMonthActualExpenses

  const lastMonthExpenses = expenses.filter((exp) => {
    if (exp.status !== "final") return false
    const expDate = new Date(exp.updatedAt)
    return expDate.getMonth() === lastMonth && expDate.getFullYear() === lastMonthYear
  })
  const lastMonthTotalPaid = lastMonthExpenses.reduce(
    (sum, exp) => sum + (exp.paidAmount || 0),
    0
  )
  const lastMonthActualExpenses = lastMonthExpenses.reduce((sum, exp) => {
    return sum + exp.items.reduce((itemSum, item) => itemSum + item.actual, 0)
  }, 0)
  const lastMonthNetProfit = lastMonthTotalPaid - lastMonthActualExpenses

  const revenueChange =
    lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0
  const profitChange =
    lastMonthNetProfit > 0
      ? ((thisMonthNetProfit - lastMonthNetProfit) / lastMonthNetProfit) * 100
      : 0

  return {
    revenue: thisMonthRevenue,
    netProfit: thisMonthNetProfit,
    revenueChange,
    profitChange,
  }
}

/**
 * Extract unique years from datasets
 */
export function extractAvailableYears(
  invoices: Invoice[],
  quotations: Quotation[],
  expenses: Expense[]
): number[] {
  const years = new Set<number>()
  years.add(new Date().getFullYear())

  invoices.forEach((inv) => {
    if (inv.productionDate) {
      years.add(new Date(inv.productionDate).getFullYear())
    }
  })

  quotations.forEach((q) => {
    if (q.productionDate) {
      years.add(new Date(q.productionDate).getFullYear())
    }
  })

  expenses.forEach((exp) => {
    if (exp.productionDate) {
      years.add(new Date(exp.productionDate).getFullYear())
    }
  })

  return Array.from(years).sort((a, b) => b - a)
}

/**
 * Get relative time string
 */
export function getRelativeTime(date: string): string {
  const now = new Date().getTime()
  const activityTime = new Date(date).getTime()
  const diff = now - activityTime

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 60) {
    return minutes === 0 ? "Just now" : `${minutes} minute${minutes > 1 ? "s" : ""} ago`
  } else if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`
  } else if (days < 7) {
    return `${days} day${days > 1 ? "s" : ""} ago`
  } else {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    })
  }
}
