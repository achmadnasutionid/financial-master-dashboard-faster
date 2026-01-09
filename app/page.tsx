"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, FileText, FileSignature, Package, Calendar, FileCheck, Receipt, Wallet, TrendingUp, TrendingDown, AlertCircle, Clock, FileX, Activity, ArrowUp, ArrowDown, Minus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar, BarChart, Cell } from 'recharts'

export default function Home() {
  const router = useRouter()
  const [invoiceStats, setInvoiceStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    paid: 0,
  })
  const [quotationStats, setQuotationStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    accepted: 0,
  })
  const [expenseStats, setExpenseStats] = useState({
    totalUnderBudget: 0,
    totalOverBudget: 0,
    averageEfficiency: 0,
    grossProfit: 0,
    netProfit: 0,
    marginPercentage: 0,
  })
  const [extraExpenses, setExtraExpenses] = useState({
    gearTotal: 0,
    bigTotal: 0,
  })
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([])
  const [productExpenses, setProductExpenses] = useState<any[]>([])
  const [etcExpenses, setEtcExpenses] = useState<any[]>([])
  const [showAllProducts, setShowAllProducts] = useState(false)
  const currentYear = new Date().getFullYear().toString()
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<string>(currentYear)
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>(currentYear)
  const [selectedTrendsYear, setSelectedTrendsYear] = useState<string>(currentYear)
  const [selectedProductsYear, setSelectedProductsYear] = useState<string>(currentYear)
  const [loading, setLoading] = useState(true)
  
  // Store all fetched data for client-side filtering
  const [allInvoices, setAllInvoices] = useState<any[]>([])
  const [allQuotations, setAllQuotations] = useState<any[]>([])
  const [allExpenses, setAllExpenses] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [allGearExpenses, setAllGearExpenses] = useState<any[]>([])
  const [allBigExpenses, setAllBigExpenses] = useState<any[]>([])
  
  // Action Items State
  const [actionItems, setActionItems] = useState({
    pendingInvoices: { count: 0, totalAmount: 0, items: [] as any[] },
    pendingQuotations: { count: 0, items: [] as any[] },
    draftExpenses: { count: 0 }
  })
  
  // Recent Activities State
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  
  // This Month Summary State
  const [thisMonthSummary, setThisMonthSummary] = useState({
    revenue: 0,
    projectsCompleted: 0,
    netProfit: 0,
    revenueChange: 0,
    projectsChange: 0,
    profitChange: 0
  })

  // Fetch statistics
  // Auto weekly backup - runs silently on app startup
  useEffect(() => {
    const runBackup = async () => {
      try {
        await fetch("/api/backup")
      } catch (error) {
        // Silent fail - backup is not critical for app function
        console.error("Auto backup check failed:", error)
      }
    }
    runBackup()
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // NEW: Single consolidated API call instead of 6 separate calls!
        const response = await fetch("/api/dashboard-stats", { cache: 'no-store' })
        const data = await response.json()
        
        const { invoices, quotations, expenses, products, gearExpenses, bigExpenses, planning } = data

        // Store all data for client-side filtering
        setAllInvoices(invoices)
        setAllQuotations(quotations)
        setAllExpenses(expenses)
        setAllProducts(products)
        setAllGearExpenses(gearExpenses)
        setAllBigExpenses(bigExpenses)

        // Extract unique years from all datasets
        const years = new Set<number>()
        // Always include current year so it's never blank
        years.add(new Date().getFullYear())
        invoices.forEach((inv: any) => {
          if (inv.productionDate) {
            const year = new Date(inv.productionDate).getFullYear()
            years.add(year)
          }
        })
        quotations.forEach((q: any) => {
          if (q.productionDate) {
            const year = new Date(q.productionDate).getFullYear()
            years.add(year)
          }
        })
        expenses.forEach((exp: any) => {
          if (exp.productionDate) {
            const year = new Date(exp.productionDate).getFullYear()
            years.add(year)
          }
        })
        setAvailableYears(Array.from(years).sort((a, b) => b - a))

        // Calculate stats with year filter
        calculateStats(invoices, quotations, selectedYear)
        calculateExpenseStats(expenses, selectedFinancialYear)
        calculateExtraExpenses(gearExpenses, bigExpenses, selectedFinancialYear)
        calculateMonthlyTrends(expenses, selectedTrendsYear)
        calculateProductExpenses(expenses, products, selectedProductsYear)
        calculateActionItems(invoices, quotations, expenses)
        calculateRecentActivities(invoices, quotations, expenses, planning)
        calculateThisMonthSummary(invoices, expenses)
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Recalculate stats when year filter changes (client-side filtering)
  useEffect(() => {
    if (allInvoices.length > 0 && allQuotations.length > 0 && !loading) {
      calculateStats(allInvoices, allQuotations, selectedYear)
    }
  }, [selectedYear, allInvoices, allQuotations, loading])

  // Recalculate expense stats when financial year filter changes (client-side filtering)
  useEffect(() => {
    if (allExpenses.length > 0 && !loading) {
      calculateExpenseStats(allExpenses, selectedFinancialYear)
      calculateExtraExpenses(allGearExpenses, allBigExpenses, selectedFinancialYear)
    }
  }, [selectedFinancialYear, allExpenses, allGearExpenses, allBigExpenses, loading])

  // Recalculate trends when trends year filter changes (client-side filtering)
  useEffect(() => {
    if (allExpenses.length > 0 && !loading) {
      calculateMonthlyTrends(allExpenses, selectedTrendsYear)
    }
  }, [selectedTrendsYear, allExpenses, loading])

  // Recalculate products when products year filter changes (client-side filtering)
  useEffect(() => {
    if (allExpenses.length > 0 && allProducts.length > 0 && !loading) {
      calculateProductExpenses(allExpenses, allProducts, selectedProductsYear)
    }
  }, [selectedProductsYear, allExpenses, allProducts, loading])

  const calculateStats = (invoices: any[], quotations: any[], year: string) => {
    // Filter by year if not "all" - using productionDate
    const filteredInvoices = year === "all" 
      ? invoices 
      : invoices.filter((inv: any) => inv.productionDate && new Date(inv.productionDate).getFullYear().toString() === year)
    
    const filteredQuotations = year === "all"
      ? quotations
      : quotations.filter((q: any) => q.productionDate && new Date(q.productionDate).getFullYear().toString() === year)

    // Calculate invoice totals (sum of totalAmount for each status)
    const invoiceTotal = filteredInvoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)
    const invoicePending = filteredInvoices.filter((inv: any) => inv.status === "pending").reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)
    const invoicePaid = filteredInvoices.filter((inv: any) => inv.status === "paid").reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)
    const invoiceDraftCount = filteredInvoices.filter((inv: any) => inv.status === "draft").length

    setInvoiceStats({
      total: invoiceTotal,
      draft: invoiceDraftCount,
      pending: invoicePending,
      paid: invoicePaid,
    })

    // Calculate quotation totals (sum of totalAmount for each status)
    const quotationTotal = filteredQuotations.reduce((sum: number, q: any) => sum + (q.totalAmount || 0), 0)
    const quotationPending = filteredQuotations.filter((q: any) => q.status === "pending").reduce((sum: number, q: any) => sum + (q.totalAmount || 0), 0)
    const quotationAccepted = filteredQuotations.filter((q: any) => q.status === "accepted").reduce((sum: number, q: any) => sum + (q.totalAmount || 0), 0)
    const quotationDraftCount = filteredQuotations.filter((q: any) => q.status === "draft").length

    setQuotationStats({
      total: quotationTotal,
      draft: quotationDraftCount,
      pending: quotationPending,
      accepted: quotationAccepted,
    })
  }

  const calculateExpenseStats = (expenses: any[], year: string) => {
    // Filter by year if not "all" - using expense's own productionDate
    const filteredExpenses = year === "all"
      ? expenses
      : expenses.filter((exp: any) => exp.productionDate && new Date(exp.productionDate).getFullYear().toString() === year)

    // Only consider finalized expenses
    const finalExpenses = filteredExpenses.filter((exp: any) => exp.status === "final")

    let totalUnderBudget = 0
    let totalOverBudget = 0
    let totalEfficiency = 0
    let countWithPaid = 0
    let grossProfit = 0 // Total paid amount
    let totalActualExpenses = 0 // Total actual expenses

    finalExpenses.forEach((exp: any) => {
      const totalPaid = exp.paidAmount || 0
      const totalActual = exp.items.reduce((sum: number, item: any) => sum + item.actual, 0)
      const difference = totalPaid - totalActual

      // Accumulate for gross and net profit
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

    setExpenseStats({
      totalUnderBudget,
      totalOverBudget,
      averageEfficiency: countWithPaid > 0 ? totalEfficiency / countWithPaid : 0,
      grossProfit,
      netProfit,
      marginPercentage,
    })
  }

  const calculateExtraExpenses = (gearExpenses: any[], bigExpenses: any[], year: string) => {
    // Filter by year if not "all"
    const filteredGear = year === "all"
      ? gearExpenses
      : gearExpenses.filter((exp: any) => exp.year.toString() === year)
    
    const filteredBig = year === "all"
      ? bigExpenses
      : bigExpenses.filter((exp: any) => exp.year.toString() === year)

    const gearTotal = filteredGear.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)
    const bigTotal = filteredBig.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)

    setExtraExpenses({
      gearTotal,
      bigTotal,
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getActivityLink = (activity: any) => {
    switch (activity.type) {
      case 'invoice':
        return `/invoice/${activity.id}/view`
      case 'quotation':
        return `/quotation/${activity.id}/view`
      case 'expense':
        return activity.action === 'finalized' ? `/expense/${activity.id}/view` : `/expense/${activity.id}/edit`
      case 'planning':
        return `/planning/${activity.id}/view`
      default:
        return '#'
    }
  }

  const getRelativeTime = (date: string) => {
    const now = new Date().getTime()
    const activityTime = new Date(date).getTime()
    const diff = now - activityTime

    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) {
      return minutes === 0 ? 'Just now' : `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else if (days < 7) {
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else {
      return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    }
  }

  const calculateMonthlyTrends = (expenses: any[], year: string) => {
    // Filter expenses by year - using expense's own productionDate
    const filteredExpenses = year === "all"
      ? expenses.filter((exp: any) => exp.status === "final")
      : expenses.filter((exp: any) => {
          if (!exp.productionDate) return false
          const expYear = new Date(exp.productionDate).getFullYear().toString()
          return expYear === year && exp.status === "final"
        })

    // Initialize monthly data
    const monthlyData: any = {}
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    months.forEach((month, index) => {
      monthlyData[index + 1] = {
        month,
        grossProfit: 0,
        netProfit: 0,
        underBudget: 0,
        overBudget: 0,
        projectCount: 0,
        totalInvoiceValue: 0,
      }
    })

    // Aggregate data by month
    filteredExpenses.forEach((exp: any) => {
      // Use expense's own productionDate for month aggregation
      const month = exp.productionDate 
        ? new Date(exp.productionDate).getMonth() + 1 
        : new Date(exp.createdAt).getMonth() + 1 // Fallback to createdAt if no productionDate
      const totalPaid = exp.paidAmount || 0
      const totalActual = exp.items.reduce((sum: number, item: any) => sum + item.actual, 0)
      const difference = totalPaid - totalActual

      // Convert to millions (Juta Rupiah) - divide by 1,000,000
      monthlyData[month].grossProfit += totalPaid / 1000000
      monthlyData[month].netProfit += difference / 1000000
      monthlyData[month].projectCount += 1
      monthlyData[month].totalInvoiceValue += totalPaid

      if (difference >= 0) {
        monthlyData[month].underBudget += difference / 1000000
      } else {
        monthlyData[month].overBudget += Math.abs(difference) / 1000000
      }
    })

    // Calculate derived metrics
    Object.keys(monthlyData).forEach((monthKey) => {
      const data = monthlyData[monthKey]
      // Profit margin percentage
      data.profitMargin = data.grossProfit > 0 ? (data.netProfit / data.grossProfit) * 100 : 0
      // Average invoice value in millions
      data.averageValue = data.projectCount > 0 ? data.totalInvoiceValue / data.projectCount / 1000000 : 0
    })

    // Convert to array format for recharts
    const trendsData = Object.values(monthlyData)
    setMonthlyTrends(trendsData)
  }

  const calculateProductExpenses = (expenses: any[], products: any[], year: string) => {
    // Filter by year and only finalized expenses - using expense's own productionDate
    const filteredExpenses = year === "all"
      ? expenses.filter((exp: any) => exp.status === "final")
      : expenses.filter((exp: any) => {
          if (!exp.productionDate) return false
          const expYear = new Date(exp.productionDate).getFullYear().toString()
          return expYear === year && exp.status === "final"
        })
    
    // Get master product names
    const masterProductNames = products.map((p: any) => p.name)
    
    // Aggregate expenses by product
    const productTotals: { [key: string]: number } = {}
    const etcTotals: { [key: string]: number } = {}
    
    filteredExpenses.forEach((exp: any) => {
      exp.items.forEach((item: any) => {
        const actual = item.actual || 0
        const productName = item.productName
        
        // Check if product is from master data
        if (masterProductNames.includes(productName)) {
          productTotals[productName] = (productTotals[productName] || 0) + actual
        } else {
          // It's an ETC item (manually typed)
          etcTotals[productName] = (etcTotals[productName] || 0) + actual
        }
      })
    })
    
    // Convert to array and sort by amount (descending)
    const productArray = Object.entries(productTotals).map(([name, amount]) => ({
      name,
      amount: amount / 1000000, // Convert to millions
      percentage: 0, // Will be calculated below
    })).sort((a, b) => b.amount - a.amount)
    
    const etcArray = Object.entries(etcTotals).map(([name, amount]) => ({
      name,
      amount: amount / 1000000, // Convert to millions
      percentage: 0, // Will be calculated below
    })).sort((a, b) => b.amount - a.amount)
    
    // Calculate totals for percentage
    const totalProductExpense = productArray.reduce((sum, p) => sum + p.amount, 0)
    const totalEtcExpense = etcArray.reduce((sum, p) => sum + p.amount, 0)
    
    // Add percentage
    productArray.forEach(p => {
      p.percentage = totalProductExpense > 0 ? (p.amount / totalProductExpense) * 100 : 0
    })
    
    etcArray.forEach(p => {
      p.percentage = totalEtcExpense > 0 ? (p.amount / totalEtcExpense) * 100 : 0
    })
    
    setProductExpenses(productArray)
    setEtcExpenses(etcArray)
  }

  const calculateActionItems = (invoices: any[], quotations: any[], expenses: any[]) => {
    // 1. Pending Invoices (status = "pending")
    const pendingInvoicesList = invoices.filter((inv: any) => inv.status === "pending")
    const pendingInvoicesTotal = pendingInvoicesList.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)

    // 2. Pending Quotations (status = "pending", sorted by days since last update)
    const now = new Date().getTime()
    const pendingQuotationsList = quotations
      .filter((q: any) => q.status === "pending")
      .map((q: any) => {
        const updatedDate = q.updatedAt ? new Date(q.updatedAt).getTime() : new Date(q.createdAt).getTime()
        const days = Math.floor((now - updatedDate) / (1000 * 60 * 60 * 24))
        return {
          ...q,
          daysSinceUpdate: isNaN(days) ? 0 : days
        }
      })
      .sort((a: any, b: any) => b.daysSinceUpdate - a.daysSinceUpdate)

    // 3. Draft Expenses (status = "draft")
    const draftExpensesCount = expenses.filter((exp: any) => exp.status === "draft").length

    setActionItems({
      pendingInvoices: {
        count: pendingInvoicesList.length,
        totalAmount: pendingInvoicesTotal,
        items: pendingInvoicesList
      },
      pendingQuotations: {
        count: pendingQuotationsList.length,
        items: pendingQuotationsList
      },
      draftExpenses: {
        count: draftExpensesCount
      }
    })
  }

  const calculateRecentActivities = (invoices: any[], quotations: any[], expenses: any[], planning: any[]) => {
    const activities: any[] = []

    // Add recent invoices
    invoices.forEach((inv: any) => {
      activities.push({
        type: 'invoice',
        id: inv.id,
        displayId: inv.invoiceId,
        action: inv.status === 'paid' ? 'marked as PAID' : inv.status === 'pending' ? 'set to PENDING' : 'created',
        timestamp: new Date(inv.updatedAt).getTime(),
        date: inv.updatedAt,
        icon: 'receipt',
        color: inv.status === 'paid' ? 'green' : inv.status === 'pending' ? 'blue' : 'yellow'
      })
    })

    // Add recent quotations
    quotations.forEach((q: any) => {
      activities.push({
        type: 'quotation',
        id: q.id,
        displayId: q.quotationId,
        action: q.status === 'accepted' ? 'marked as ACCEPTED' : q.status === 'pending' ? 'set to PENDING' : 'created',
        timestamp: new Date(q.updatedAt).getTime(),
        date: q.updatedAt,
        icon: 'file-check',
        color: q.status === 'accepted' ? 'green' : q.status === 'pending' ? 'yellow' : 'gray'
      })
    })

    // Add recent expenses
    expenses.forEach((exp: any) => {
      activities.push({
        type: 'expense',
        id: exp.id,
        displayId: exp.expenseId,
        action: exp.status === 'final' ? 'finalized' : 'created',
        timestamp: new Date(exp.updatedAt).getTime(),
        date: exp.updatedAt,
        icon: 'wallet',
        color: exp.status === 'final' ? 'green' : 'orange'
      })
    })

    // Add recent planning
    planning.forEach((plan: any) => {
      activities.push({
        type: 'planning',
        id: plan.id,
        displayId: plan.planningId,
        action: plan.status === 'final' ? 'finalized' : 'created',
        timestamp: new Date(plan.updatedAt).getTime(),
        date: plan.updatedAt,
        icon: 'calendar',
        color: plan.status === 'final' ? 'green' : 'gray'
      })
    })

    // Sort by timestamp (newest first) and take top 4
    const sortedActivities = activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 4)

    setRecentActivities(sortedActivities)
  }

  const calculateThisMonthSummary = (invoices: any[], expenses: any[]) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

    // This month - paid invoices (revenue)
    const thisMonthPaidInvoices = invoices.filter((inv: any) => {
      if (inv.status !== 'paid') return false
      const invDate = new Date(inv.updatedAt)
      return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear
    })
    const thisMonthRevenue = thisMonthPaidInvoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)

    // Last month - paid invoices (revenue)
    const lastMonthPaidInvoices = invoices.filter((inv: any) => {
      if (inv.status !== 'paid') return false
      const invDate = new Date(inv.updatedAt)
      return invDate.getMonth() === lastMonth && invDate.getFullYear() === lastMonthYear
    })
    const lastMonthRevenue = lastMonthPaidInvoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)

    // This month - finalized expenses (projects completed and net profit)
    const thisMonthExpenses = expenses.filter((exp: any) => {
      if (exp.status !== 'final') return false
      const expDate = new Date(exp.updatedAt)
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear
    })
    const thisMonthProjectsCompleted = thisMonthExpenses.length
    const thisMonthTotalPaid = thisMonthExpenses.reduce((sum: number, exp: any) => sum + (exp.paidAmount || 0), 0)
    const thisMonthActualExpenses = thisMonthExpenses.reduce((sum: number, exp: any) => {
      return sum + exp.items.reduce((itemSum: number, item: any) => itemSum + item.actual, 0)
    }, 0)
    const thisMonthNetProfit = thisMonthTotalPaid - thisMonthActualExpenses

    // Last month - finalized expenses (projects completed and net profit)
    const lastMonthExpenses = expenses.filter((exp: any) => {
      if (exp.status !== 'final') return false
      const expDate = new Date(exp.updatedAt)
      return expDate.getMonth() === lastMonth && expDate.getFullYear() === lastMonthYear
    })
    const lastMonthProjectsCompleted = lastMonthExpenses.length
    const lastMonthTotalPaid = lastMonthExpenses.reduce((sum: number, exp: any) => sum + (exp.paidAmount || 0), 0)
    const lastMonthActualExpenses = lastMonthExpenses.reduce((sum: number, exp: any) => {
      return sum + exp.items.reduce((itemSum: number, item: any) => itemSum + item.actual, 0)
    }, 0)
    const lastMonthNetProfit = lastMonthTotalPaid - lastMonthActualExpenses

    // Calculate percentage changes
    const revenueChange = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0
    const projectsChange = lastMonthProjectsCompleted > 0 ? ((thisMonthProjectsCompleted - lastMonthProjectsCompleted) / lastMonthProjectsCompleted) * 100 : 0
    const profitChange = lastMonthNetProfit > 0 ? ((thisMonthNetProfit - lastMonthNetProfit) / lastMonthNetProfit) * 100 : 0

    setThisMonthSummary({
      revenue: thisMonthRevenue,
      projectsCompleted: thisMonthProjectsCompleted,
      netProfit: thisMonthNetProfit,
      revenueChange,
      projectsChange,
      profitChange
    })
  }

  // Get least expense, excluding PHOTOGRAPHER (since it's profit, not expense)
  const getLeastExpense = () => {
    // Start from the end (least) and find first non-PHOTOGRAPHER product
    for (let i = productExpenses.length - 1; i >= 0; i--) {
      if (productExpenses[i].name.toUpperCase() !== "PHOTOGRAPHER") {
        return productExpenses[i]
      }
    }
    // If all products are PHOTOGRAPHER (unlikely), return null
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-12">
          {/* Quick Action Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight">Quick Action</h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Planning Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/planning')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Planning</CardTitle>
                </CardHeader>
              </Card>

              {/* Quotation Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/quotation')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <FileCheck className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Quotation</CardTitle>
                </CardHeader>
              </Card>

              {/* Invoice Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/invoice')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Receipt className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Invoice</CardTitle>
                </CardHeader>
              </Card>

              {/* Expenses Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/expense')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Expenses</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Action Items Section - What Needs Attention */}
          {!loading && (actionItems.pendingInvoices.count > 0 || actionItems.pendingQuotations.count > 0 || actionItems.draftExpenses.count > 0) && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <h2 className="text-xl font-bold tracking-tight">Action Items</h2>
                <span className="text-sm text-muted-foreground">
                  ({actionItems.pendingInvoices.count + actionItems.pendingQuotations.count + actionItems.draftExpenses.count} items need attention)
                </span>
              </div>

              <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
                {/* Pending Invoices */}
                {actionItems.pendingInvoices.count > 0 && (
                  <Card 
                    className="group cursor-pointer transition-all hover:shadow-lg hover:border-blue-500/50"
                    onClick={() => router.push('/invoice?status=pending')}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-5 w-5 text-blue-600" />
                          <CardTitle className="text-base">Pending Invoices</CardTitle>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">
                          {actionItems.pendingInvoices.count}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm text-muted-foreground">Total Amount:</span>
                          <span className="text-lg font-semibold text-blue-700">
                            {formatCurrency(actionItems.pendingInvoices.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Pending Quotations */}
                {actionItems.pendingQuotations.count > 0 && (
                  <Card 
                    className="group cursor-pointer transition-all hover:shadow-lg hover:border-yellow-500/50"
                    onClick={() => router.push('/quotation?status=pending')}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-yellow-600" />
                          <CardTitle className="text-base">Pending Quotations</CardTitle>
                        </div>
                        <span className="text-2xl font-bold text-yellow-600">
                          {actionItems.pendingQuotations.count}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {actionItems.pendingQuotations.items.slice(0, 2).map((q: any) => (
                          <div key={q.id} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground truncate flex-1">
                              {q.quotationId}
                            </span>
                            <span className="text-yellow-700 font-medium whitespace-nowrap ml-2">
                              {q.daysSinceUpdate}d ago
                            </span>
                          </div>
                        ))}
                        {actionItems.pendingQuotations.count > 2 && (
                          <p className="text-xs text-muted-foreground pt-1">
                            +{actionItems.pendingQuotations.count - 2} more
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Draft Expenses */}
                {actionItems.draftExpenses.count > 0 && (
                  <Card 
                    className="group cursor-pointer transition-all hover:shadow-lg hover:border-orange-500/50"
                    onClick={() => router.push('/expense?status=draft')}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileX className="h-5 w-5 text-orange-600" />
                          <CardTitle className="text-base">Draft Expenses</CardTitle>
                        </div>
                        <span className="text-2xl font-bold text-orange-600">
                          {actionItems.draftExpenses.count}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {actionItems.draftExpenses.count} {actionItems.draftExpenses.count === 1 ? 'expense' : 'expenses'} not yet finalized
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Recent Activity Timeline */}
          {!loading && recentActivities.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Recent Activity</h2>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Activities Card */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {recentActivities.map((activity, index) => (
                        <div 
                          key={`${activity.type}-${activity.id}-${index}`} 
                          className="flex items-start gap-4 pb-4 last:pb-0 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                          onClick={() => router.push(getActivityLink(activity))}
                        >
                          {/* Icon */}
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 ${
                            activity.color === 'green' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-100' :
                            activity.color === 'blue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-100' :
                            activity.color === 'yellow' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-100' :
                            activity.color === 'orange' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-100' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {activity.icon === 'receipt' && <Receipt className="h-5 w-5" />}
                            {activity.icon === 'file-check' && <FileCheck className="h-5 w-5" />}
                            {activity.icon === 'wallet' && <Wallet className="h-5 w-5" />}
                            {activity.icon === 'calendar' && <Calendar className="h-5 w-5" />}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-semibold">{activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}</span>
                              {' '}
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{activity.displayId}</span>
                              {' '}
                              <span className="text-muted-foreground">{activity.action}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {getRelativeTime(activity.date)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* This Month Summary Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">This Month Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Revenue */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        <p className="text-lg font-bold">{formatCurrency(thisMonthSummary.revenue)}</p>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        thisMonthSummary.revenueChange > 0 ? 'text-green-600' : 
                        thisMonthSummary.revenueChange < 0 ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {thisMonthSummary.revenueChange > 0 && <ArrowUp className="h-3 w-3" />}
                        {thisMonthSummary.revenueChange < 0 && <ArrowDown className="h-3 w-3" />}
                        {thisMonthSummary.revenueChange === 0 && <Minus className="h-3 w-3" />}
                        {Math.abs(thisMonthSummary.revenueChange).toFixed(0)}%
                      </div>
                    </div>

                    {/* Projects Completed */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Projects Completed</p>
                        <p className="text-lg font-bold">{thisMonthSummary.projectsCompleted}</p>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        thisMonthSummary.projectsChange > 0 ? 'text-green-600' : 
                        thisMonthSummary.projectsChange < 0 ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {thisMonthSummary.projectsChange > 0 && <ArrowUp className="h-3 w-3" />}
                        {thisMonthSummary.projectsChange < 0 && <ArrowDown className="h-3 w-3" />}
                        {thisMonthSummary.projectsChange === 0 && <Minus className="h-3 w-3" />}
                        {Math.abs(thisMonthSummary.projectsChange).toFixed(0)}%
                      </div>
                    </div>

                    {/* Net Profit */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Net Profit</p>
                        <p className={`text-lg font-bold ${
                          thisMonthSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(thisMonthSummary.netProfit)}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        thisMonthSummary.profitChange > 0 ? 'text-green-600' : 
                        thisMonthSummary.profitChange < 0 ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {thisMonthSummary.profitChange > 0 && <ArrowUp className="h-3 w-3" />}
                        {thisMonthSummary.profitChange < 0 && <ArrowDown className="h-3 w-3" />}
                        {thisMonthSummary.profitChange === 0 && <Minus className="h-3 w-3" />}
                        {Math.abs(thisMonthSummary.profitChange).toFixed(0)}%
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground pt-1">
                      Compared to last month
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Special Case Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight">Special Case</h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Paragon Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/special-case/paragon')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Paragon</CardTitle>
                </CardHeader>
              </Card>

              {/* Erha Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/special-case/erha')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Erha</CardTitle>
                </CardHeader>
              </Card>

              {/* Gear Expenses Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/special-case/gear-expenses')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Gear Expenses</CardTitle>
                </CardHeader>
              </Card>

              {/* Big Expenses Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/special-case/big-expenses')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Big Expenses</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Quotations & Invoices Analytics Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Quotations & Invoices</h2>
              </div>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 w-24 bg-muted rounded" />
                      <div className="h-8 w-16 bg-muted rounded mt-2" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Quotations Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                  onClick={() => router.push('/quotation')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Quotations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-primary break-words">{formatCurrency(quotationStats.total)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total value</p>
                  </CardContent>
                </Card>

                {/* Draft Quotations Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-yellow-500/50"
                  onClick={() => router.push('/quotation?status=draft')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Draft Quotations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-[hsl(38_92%_50%)]">{quotationStats.draft}</div>
                    <p className="text-xs text-muted-foreground mt-1">In progress</p>
                  </CardContent>
                </Card>

                {/* Pending Quotations Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-blue-500/50"
                  onClick={() => router.push('/quotation?status=pending')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pending Quotations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-[hsl(199_89%_48%)] break-words">{formatCurrency(quotationStats.pending)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Awaiting acceptance</p>
                  </CardContent>
                </Card>

                {/* Accepted Quotations Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-green-500/50"
                  onClick={() => router.push('/quotation?status=accepted')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Accepted Quotations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-[hsl(142_76%_36%)] break-words">{formatCurrency(quotationStats.accepted)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Completed</p>
                  </CardContent>
                </Card>

                {/* Total Invoices Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                  onClick={() => router.push('/invoice')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-primary break-words">{formatCurrency(invoiceStats.total)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total value</p>
                  </CardContent>
                </Card>

                {/* Draft Invoices Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-yellow-500/50"
                  onClick={() => router.push('/invoice?status=draft')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Draft Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-[hsl(38_92%_50%)]">{invoiceStats.draft}</div>
                    <p className="text-xs text-muted-foreground mt-1">In progress</p>
                  </CardContent>
                </Card>

                {/* Pending Invoices Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-blue-500/50"
                  onClick={() => router.push('/invoice?status=pending')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pending Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-[hsl(199_89%_48%)] break-words">{formatCurrency(invoiceStats.pending)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
                  </CardContent>
                </Card>

                {/* Paid Invoices Card */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-green-500/50"
                  onClick={() => router.push('/invoice?status=paid')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Paid Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-[hsl(142_76%_36%)] break-words">{formatCurrency(invoiceStats.paid)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Completed</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Financial Health Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Financial Health</h2>
              </div>
              <Select value={selectedFinancialYear} onValueChange={setSelectedFinancialYear}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <>
                <Card className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-4 w-24 bg-muted rounded" />
                          <div className="h-8 w-32 bg-muted rounded" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-4 w-24 bg-muted rounded" />
                          <div className="h-8 w-32 bg-muted rounded" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="animate-pulse border-2">
                  <CardContent className="pt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-4 w-24 bg-muted rounded" />
                          <div className="h-8 w-32 bg-muted rounded" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {/* Under Budget */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Under Budget</p>
                        <p className="text-4xl font-bold text-[hsl(142_76%_36%)]">
                          {formatCurrency(expenseStats.totalUnderBudget)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total savings</p>
                      </div>

                      {/* Over Budget */}
                      <div className="space-y-2 border-l border-r px-6">
                        <p className="text-sm font-medium text-muted-foreground">Over Budget</p>
                        <p className="text-4xl font-bold text-red-600">
                          {formatCurrency(expenseStats.totalOverBudget)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total overspend</p>
                      </div>

                      {/* Efficiency */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Efficiency</p>
                        <p className={`text-4xl font-bold ${
                          expenseStats.averageEfficiency >= 0 ? "text-[hsl(142_76%_36%)]" : "text-red-600"
                        }`}>
                          {expenseStats.averageEfficiency.toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Average efficiency</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {/* Gross Profit */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Gross Profit</p>
                        <p className="text-4xl font-bold text-[hsl(199_89%_48%)]">
                          {formatCurrency(expenseStats.grossProfit)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total client paid amount</p>
                      </div>

                      {/* Net Profit */}
                      <div className="space-y-2 border-l border-r px-6">
                        <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                        <p className={`text-4xl font-bold ${
                          expenseStats.netProfit >= 0 ? "text-[hsl(142_76%_36%)]" : "text-red-600"
                        }`}>
                          {formatCurrency(expenseStats.netProfit)}
                        </p>
                        <p className="text-xs text-muted-foreground">Paid - Actual expenses</p>
                      </div>

                      {/* Margin Percentage */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Margin</p>
                        <p className={`text-4xl font-bold ${
                          expenseStats.marginPercentage >= 0 ? "text-[hsl(142_76%_36%)]" : "text-red-600"
                        }`}>
                          {expenseStats.marginPercentage.toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Profit margin</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Extra Expenses Card */}
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {/* Net Profit After Expenses */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Net Profit After Expenses</p>
                        <p className={`text-4xl font-bold ${
                          (expenseStats.netProfit - extraExpenses.gearTotal - extraExpenses.bigTotal) >= 0 
                            ? "text-green-600" 
                            : "text-red-600"
                        }`}>
                          {formatCurrency(expenseStats.netProfit - extraExpenses.gearTotal - extraExpenses.bigTotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">Net - Gear - Big expenses</p>
                      </div>

                      {/* Gear Expenses */}
                      <div className="space-y-2 border-l border-r px-6">
                        <p className="text-sm font-medium text-muted-foreground">Gear Expenses</p>
                        <p className="text-4xl font-bold text-orange-600">
                          {formatCurrency(extraExpenses.gearTotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total gear expenses</p>
                      </div>

                      {/* Big Expenses */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Big Expenses</p>
                        <p className="text-4xl font-bold text-red-600">
                          {formatCurrency(extraExpenses.bigTotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total big expenses</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Financial Trends Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Financial Trends</h2>
              </div>
              <Select value={selectedTrendsYear} onValueChange={setSelectedTrendsYear}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 w-48 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 bg-muted rounded" />
                  </CardContent>
                </Card>
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 w-48 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 bg-muted rounded" />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                {/* Profit Trends Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Gross & Net Profit Trends</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Amounts in Juta Rupiah (Millions)</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => `Rp ${Number(value).toFixed(2)} Juta`}
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="grossProfit" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          name="Gross Profit"
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="netProfit" 
                          stroke="#dc2626" 
                          strokeWidth={2}
                          name="Net Profit"
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Budget Trends Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Budget Trends</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Amounts in Juta Rupiah (Millions)</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => `Rp ${Number(value).toFixed(2)} Juta`}
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="underBudget" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          name="Under Budget"
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="overBudget" 
                          stroke="#dc2626" 
                          strokeWidth={2}
                          name="Over Budget"
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Second Row - Profit Margin and Project Volume */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Profit Margin Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Profit Margin Trend</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Percentage of net profit to gross profit</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis label={{ value: '%', position: 'insideLeft' }} />
                        <Tooltip 
                          formatter={(value) => `${Number(value).toFixed(0)}%`}
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="profitMargin" 
                          stroke="#2563eb" 
                          strokeWidth={3}
                          name="Profit Margin"
                          dot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Project Volume Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Project Volume Trend</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Number of completed projects per month</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => `${value} projects`}
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="projectCount" 
                          stroke="#2563eb" 
                          strokeWidth={3}
                          name="Project Count"
                          dot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              </>
            )}
          </div>

          {/* Products Overview Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Products Overview</h2>
              </div>
              <Select value={selectedProductsYear} onValueChange={setSelectedProductsYear}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 w-48 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 bg-muted rounded" />
                  </CardContent>
                </Card>
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 w-48 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 bg-muted rounded" />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Master Products Cards */}
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Most Expense Card */}
                      <Card className={`border-2 ${productExpenses[0] ? 'border-blue-200' : 'border-transparent'}`}>
                        <CardHeader className="pb-3">
                          <CardTitle className={`text-sm font-medium text-muted-foreground ${!productExpenses[0] && 'invisible'}`}>
                            Most Expense
                          </CardTitle>
                        </CardHeader>
                        <CardContent className={!productExpenses[0] ? 'invisible' : ''}>
                          {productExpenses[0] ? (
                            <>
                              <div className="text-4xl font-bold text-blue-600">
                                Rp {productExpenses[0].amount.toFixed(2)} Juta
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {productExpenses[0].name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {productExpenses[0].percentage.toFixed(1)}% of total
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="text-2xl font-bold">Placeholder</div>
                              <p className="text-sm mt-1">Placeholder</p>
                              <p className="text-xs mt-1">Placeholder</p>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      {/* Least Expense Card */}
                      {(() => {
                        const leastExpense = getLeastExpense()
                        return (
                          <Card className={`border-2 ${leastExpense ? 'border-green-200' : 'border-transparent'}`}>
                            <CardHeader className="pb-3">
                              <CardTitle className={`text-sm font-medium text-muted-foreground ${!leastExpense && 'invisible'}`}>
                                Least Expense
                              </CardTitle>
                            </CardHeader>
                            <CardContent className={!leastExpense ? 'invisible' : ''}>
                              {leastExpense ? (
                                <>
                                  <div className="text-4xl font-bold text-green-600">
                                    Rp {leastExpense.amount.toFixed(2)} Juta
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {leastExpense.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {leastExpense.percentage.toFixed(1)}% of total
                                  </p>
                                </>
                              ) : (
                                <>
                                  <div className="text-2xl font-bold">Placeholder</div>
                                  <p className="text-sm mt-1">Placeholder</p>
                                  <p className="text-xs mt-1">Placeholder</p>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })()}
                    </div>

                    {/* Master Products Chart */}
                    <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Master Products Expenses</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Top expenses from master product data (Juta Rupiah)</p>
                  </CardHeader>
                  <CardContent>
                    {productExpenses.length > 0 ? (
                      <ResponsiveContainer width="100%" height={showAllProducts ? Math.max(400, productExpenses.length * 50) : 400}>
                        <BarChart 
                          data={showAllProducts ? productExpenses : productExpenses.slice(0, 5)}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={150} />
                          <Tooltip 
                            formatter={(value, _name, props: any) => [
                              `Rp ${Number(value).toFixed(0)} Juta (${props.payload.percentage.toFixed(0)}%)`,
                              'Amount'
                            ]}
                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                          />
                          <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                            {(showAllProducts ? productExpenses : productExpenses.slice(0, 5)).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill="#2563eb" />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        No master products expenses found
                      </div>
                    )}
                    <div className="mt-4 text-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowAllProducts(!showAllProducts)}
                        className={productExpenses.length <= 5 ? "invisible" : ""}
                      >
                        {showAllProducts ? "Show Less" : `See More (${productExpenses.length - 5} more)`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ETC Items Cards and Chart */}
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* First Most ETC Expense Card */}
                  <Card 
                    className={`border-2 ${etcExpenses[0] ? 'border-red-200 cursor-pointer hover:shadow-lg transition-all' : 'border-transparent'}`}
                    onClick={etcExpenses[0] ? () => {
                      // Store the product name for auto-fill
                      sessionStorage.setItem('newProductName', etcExpenses[0].name)
                      sessionStorage.setItem('fromLanding', 'true')
                      router.push('/products?action=create')
                    } : undefined}
                    title={etcExpenses[0] ? "Click to add this to product master" : undefined}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className={`text-sm font-medium text-muted-foreground ${!etcExpenses[0] && 'invisible'}`}>
                        1st Most ETC Expense
                      </CardTitle>
                    </CardHeader>
                    <CardContent className={!etcExpenses[0] ? 'invisible' : ''}>
                      {etcExpenses[0] ? (
                        <>
                          <div className="text-4xl font-bold text-red-600">
                            Rp {etcExpenses[0].amount.toFixed(2)} Juta
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {etcExpenses[0].name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {etcExpenses[0].percentage.toFixed(1)}% of ETC total
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">Placeholder</div>
                          <p className="text-sm mt-1">Placeholder</p>
                          <p className="text-xs mt-1">Placeholder</p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Second Most ETC Expense Card */}
                  <Card 
                    className={`border-2 ${etcExpenses[1] ? 'border-orange-200 cursor-pointer hover:shadow-lg transition-all' : 'border-transparent'}`}
                    onClick={etcExpenses[1] ? () => {
                      // Store the product name for auto-fill
                      sessionStorage.setItem('newProductName', etcExpenses[1].name)
                      sessionStorage.setItem('fromLanding', 'true')
                      router.push('/products?action=create')
                    } : undefined}
                    title={etcExpenses[1] ? "Click to add this to product master" : undefined}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className={`text-sm font-medium text-muted-foreground ${!etcExpenses[1] && 'invisible'}`}>
                        2nd Most ETC Expense
                      </CardTitle>
                    </CardHeader>
                    <CardContent className={!etcExpenses[1] ? 'invisible' : ''}>
                      {etcExpenses[1] ? (
                        <>
                          <div className="text-4xl font-bold text-orange-600">
                            Rp {etcExpenses[1].amount.toFixed(2)} Juta
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {etcExpenses[1].name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {etcExpenses[1].percentage.toFixed(1)}% of ETC total
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">Placeholder</div>
                          <p className="text-sm mt-1">Placeholder</p>
                          <p className="text-xs mt-1">Placeholder</p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* ETC Items Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ETC Items Expenses</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Top 5 manually entered items (Juta Rupiah)</p>
                  </CardHeader>
                  <CardContent>
                    {etcExpenses.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart 
                          data={etcExpenses.slice(0, 5)}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={150} />
                          <Tooltip 
                            formatter={(value, _name, props: any) => [
                              `Rp ${Number(value).toFixed(0)} Juta (${props.payload.percentage.toFixed(0)}%)`,
                              'Amount'
                            ]}
                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                          />
                          <Bar dataKey="amount" fill="#dc2626" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        No ETC items found
                      </div>
                    )}
                    <div className="mt-4 text-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="invisible"
                      >
                        Placeholder
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
            )}
          </div>

          {/* Management Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight">Management</h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Companies Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/companies')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Companies</CardTitle>
                </CardHeader>
              </Card>

              {/* Billings Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/billings')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Billings</CardTitle>
                </CardHeader>
              </Card>

              {/* Signatures Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/signatures')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <FileSignature className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Signatures</CardTitle>
                </CardHeader>
              </Card>

              {/* Products Card */}
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => router.push('/products')}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Products</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
