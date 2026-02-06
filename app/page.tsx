"use client"

/**
 * PERFORMANCE OPTIMIZATION:
 * This dashboard has been optimized to prevent multiple re-renders:
 * 
 * 1. Data is fetched ONCE on mount (not on year filter changes)
 * 2. All calculations use useMemo to only recalculate when specific dependencies change
 * 3. Each year filter has its own isolated memoized calculation
 * 4. State updates only trigger when memoized values actually change
 * 
 * Previous Issue: Changing any year filter triggered 4+ cascading re-calculations
 * Current: Each filter change triggers only 1 targeted recalculation
 */

import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

// Dashboard components
import { QuickActionSection, CardsSection } from "@/components/dashboard/cards-section"
import { ActionItemsSection } from "@/components/dashboard/action-items-section"
import { ThisMonthSummarySection } from "@/components/dashboard/this-month-summary-section"
import { RecentActivitySection } from "@/components/dashboard/recent-activity-section"
import { QuotationsInvoicesSection } from "@/components/dashboard/quotations-invoices-section"
import { FinancialHealthSection } from "@/components/dashboard/financial-health-section"
import { FinancialTrendsSection } from "@/components/dashboard/financial-trends-section"
import { ProductsOverviewSection } from "@/components/dashboard/products-overview-section"

// Types and utilities
import type {
  DashboardStatsResponse,
  InvoiceStats,
  QuotationStats,
  ExpenseStats,
  ExtraExpenses,
  MonthlyTrend,
  ProductExpense,
  ActionItems,
  RecentActivity,
  ThisMonthSummary,
  DashboardCard,
  Invoice,
  Quotation,
  Expense,
  Product,
  GearExpense,
  BigExpense,
  Planning,
} from "@/types"
import {
  calculateStats,
  calculateExpenseStats,
  calculateExtraExpenses,
  calculateMonthlyTrends,
  calculateProductExpenses,
  calculateActionItems,
  calculateRecentActivities,
  calculateThisMonthSummary,
  extractAvailableYears,
  getRelativeTime,
} from "@/lib/dashboard-utils"

// Dashboard cards configuration
const ALL_CARDS: DashboardCard[] = [
  // Quick Action
  { id: "planning", section: "Quick Action", title: "Planning", keywords: "planning project plan", route: "/planning", icon: "calendar" },
  { id: "quotation", section: "Quick Action", title: "Quotation", keywords: "quotation quote qtn", route: "/quotation", icon: "file-check" },
  { id: "invoice", section: "Quick Action", title: "Invoice", keywords: "invoice inv payment bill", route: "/invoice", icon: "receipt" },
  { id: "expenses", section: "Quick Action", title: "Expenses", keywords: "expenses expense exp cost", route: "/expense", icon: "wallet" },
  
  // Special Case
  { id: "paragon", section: "Special Case", title: "Paragon", keywords: "paragon special", route: "/special-case/paragon", icon: "building" },
  { id: "erha", section: "Special Case", title: "Erha", keywords: "erha special", route: "/special-case/erha", icon: "building" },
  { id: "production-tracker", section: "Special Case", title: "Production Tracker", keywords: "production tracker entry expenses actual", route: "/special-case/production-tracker", icon: "table" },
  { id: "gear-expenses", section: "Special Case", title: "Gear Expenses", keywords: "gear expenses equipment", route: "/special-case/gear-expenses", icon: "wallet" },
  { id: "big-expenses", section: "Special Case", title: "Big Expenses", keywords: "big expenses large", route: "/special-case/big-expenses", icon: "wallet" },
  
  // Management
  { id: "companies", section: "Management", title: "Companies", keywords: "companies company client master", route: "/companies", icon: "building" },
  { id: "billings", section: "Management", title: "Billings", keywords: "billings billing bank account master", route: "/billings", icon: "file-text" },
  { id: "signatures", section: "Management", title: "Signatures", keywords: "signatures signature sign master", route: "/signatures", icon: "file-signature" },
  { id: "products", section: "Management", title: "Products", keywords: "products product master", route: "/products", icon: "package" },
  { id: "templates", section: "Management", title: "Templates", keywords: "templates template quotation master", route: "/templates", icon: "package-open" },
]

export default function Home() {
  const router = useRouter()
  
  // State management
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats>({ total: 0, draft: 0, pending: 0, paid: 0 })
  const [quotationStats, setQuotationStats] = useState<QuotationStats>({ total: 0, draft: 0, pending: 0, accepted: 0 })
  const [expenseStats, setExpenseStats] = useState<ExpenseStats>({
    totalUnderBudget: 0,
    totalOverBudget: 0,
    averageEfficiency: 0,
    grossProfit: 0,
    netProfit: 0,
    marginPercentage: 0,
  })
  const [extraExpenses, setExtraExpenses] = useState<ExtraExpenses>({ gearTotal: 0, bigTotal: 0 })
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([])
  const [productExpenses, setProductExpenses] = useState<ProductExpense[]>([])
  const [etcExpenses, setEtcExpenses] = useState<ProductExpense[]>([])
  const [showAllProducts, setShowAllProducts] = useState(false)
  
  // Year filters
  const [currentYear, setCurrentYear] = useState<string>("")
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<string>("")
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>("")
  const [selectedTrendsYear, setSelectedTrendsYear] = useState<string>("")
  const [selectedProductsYear, setSelectedProductsYear] = useState<string>("")
  
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isClient, setIsClient] = useState(false)
  
  // Store all fetched data
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([])
  const [allQuotations, setAllQuotations] = useState<Quotation[]>([])
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [allGearExpenses, setAllGearExpenses] = useState<GearExpense[]>([])
  const [allBigExpenses, setAllBigExpenses] = useState<BigExpense[]>([])
  const [allPlanning, setAllPlanning] = useState<Planning[]>([])
  
  // Action Items & Activities
  const [actionItems, setActionItems] = useState<ActionItems>({
    pendingInvoices: { count: 0, totalAmount: 0, items: [] },
    pendingQuotations: { count: 0, items: [] },
    draftExpenses: { count: 0 },
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [thisMonthSummary, setThisMonthSummary] = useState<ThisMonthSummary>({
    revenue: 0,
    netProfit: 0,
    revenueChange: 0,
    profitChange: 0,
  })

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true)
    const year = new Date().getFullYear().toString()
    setCurrentYear(year)
    setSelectedYear(year)
    setSelectedFinancialYear(year)
    setSelectedTrendsYear(year)
    setSelectedProductsYear(year)
  }, [])

  // Fetch all dashboard data (only once on mount)
  useEffect(() => {
    if (!isClient) return
    
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/dashboard-stats", { cache: "no-store" })
        const data: DashboardStatsResponse = await response.json()
        
        const { invoices, quotations, expenses, products, gearExpenses, bigExpenses, planning } = data

        // Store all data
        setAllInvoices(invoices)
        setAllQuotations(quotations)
        setAllExpenses(expenses)
        setAllProducts(products)
        setAllGearExpenses(gearExpenses)
        setAllBigExpenses(bigExpenses)
        setAllPlanning(planning)

        // Extract years
        const years = extractAvailableYears(invoices, quotations, expenses)
        setAvailableYears(years)

        // Calculate one-time stats (not dependent on year filters)
        setActionItems(calculateActionItems(invoices, quotations, expenses))
        setRecentActivities(calculateRecentActivities(invoices, quotations, expenses, planning))
        setThisMonthSummary(calculateThisMonthSummary(invoices, expenses))
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [isClient]) // Only depends on isClient - fetch once!

  // ========================================
  // OPTIMIZED: All calculations using useMemo
  // These only recalculate when their specific dependencies change
  // ========================================

  // Invoice & Quotation Stats (recalculates only when selectedYear changes)
  const memoizedInvoiceQuotationStats = useMemo(() => {
    if (allInvoices.length === 0 && allQuotations.length === 0) {
      return {
        invoiceStats: { total: 0, draft: 0, pending: 0, paid: 0 },
        quotationStats: { total: 0, draft: 0, pending: 0, accepted: 0 }
      }
    }
    return calculateStats(allInvoices, allQuotations, selectedYear)
  }, [allInvoices, allQuotations, selectedYear])

  // Financial Health Stats (recalculates only when selectedFinancialYear changes)
  const memoizedFinancialStats = useMemo(() => {
    if (allExpenses.length === 0 && allGearExpenses.length === 0 && allBigExpenses.length === 0) {
      return {
        expenseStats: {
          totalUnderBudget: 0,
          totalOverBudget: 0,
          averageEfficiency: 0,
          grossProfit: 0,
          netProfit: 0,
          marginPercentage: 0,
        },
        extraExpenses: { gearTotal: 0, bigTotal: 0 }
      }
    }
    return {
      expenseStats: calculateExpenseStats(allExpenses, selectedFinancialYear),
      extraExpenses: calculateExtraExpenses(allGearExpenses, allBigExpenses, selectedFinancialYear)
    }
  }, [allExpenses, allGearExpenses, allBigExpenses, selectedFinancialYear])

  // Monthly Trends (recalculates only when selectedTrendsYear changes)
  const memoizedMonthlyTrends = useMemo(() => {
    if (allExpenses.length === 0) return []
    return calculateMonthlyTrends(allExpenses, selectedTrendsYear)
  }, [allExpenses, selectedTrendsYear])

  // Product Expenses (recalculates only when selectedProductsYear changes)
  const memoizedProductExpenses = useMemo(() => {
    if (allExpenses.length === 0 || allProducts.length === 0) {
      return { productExpenses: [], etcExpenses: [] }
    }
    return calculateProductExpenses(allExpenses, allProducts, selectedProductsYear)
  }, [allExpenses, allProducts, selectedProductsYear])

  // Update state from memoized values (only when memo values actually change)
  useEffect(() => {
    setInvoiceStats(memoizedInvoiceQuotationStats.invoiceStats)
    setQuotationStats(memoizedInvoiceQuotationStats.quotationStats)
  }, [memoizedInvoiceQuotationStats])

  useEffect(() => {
    setExpenseStats(memoizedFinancialStats.expenseStats)
    setExtraExpenses(memoizedFinancialStats.extraExpenses)
  }, [memoizedFinancialStats])

  useEffect(() => {
    setMonthlyTrends(memoizedMonthlyTrends)
  }, [memoizedMonthlyTrends])

  useEffect(() => {
    setProductExpenses(memoizedProductExpenses.productExpenses)
    setEtcExpenses(memoizedProductExpenses.etcExpenses)
  }, [memoizedProductExpenses])

  // Format currency
  const formatCurrency = (amount: number) => {
    if (!isClient) return "Rp 0"
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Navigation handler
  const handleNavigate = (path: string) => {
    router.push(path)
  }

  // Filter cards based on search
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return ALL_CARDS
    const query = searchQuery.toLowerCase()
    return ALL_CARDS.filter(
      (card) =>
        card.title.toLowerCase().includes(query) ||
        card.keywords.toLowerCase().includes(query) ||
        card.section.toLowerCase().includes(query)
    )
  }, [searchQuery])

  // Group cards by section
  const cardsBySection = useMemo(() => {
    const sections: { [key: string]: DashboardCard[] } = {
      "Quick Action": [],
      "Special Case": [],
      Management: [],
    }
    filteredCards.forEach((card) => {
      sections[card.section].push(card)
    })
    return sections
  }, [filteredCards])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 pt-8 pb-12">
        <div className="container mx-auto max-w-7xl space-y-8">
          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search pages... (e.g., invoice, planning, products)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </Button>
            )}
          </div>

          {/* Client-side only content */}
          {!isClient ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          ) : (
            <>
              {/* No results message */}
              {searchQuery && filteredCards.length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No pages found matching &quot;{searchQuery}&quot;
                  </p>
                  <Button
                    variant="link"
                    onClick={() => setSearchQuery("")}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </Card>
              )}

              {/* Quick Action Section */}
              {cardsBySection["Quick Action"].length > 0 && (
                <QuickActionSection
                  cards={cardsBySection["Quick Action"]}
                  onNavigate={handleNavigate}
                />
              )}

              {/* Action Items Section */}
              {!searchQuery && (
                <ActionItemsSection
                  actionItems={actionItems}
                  loading={loading}
                  formatCurrency={formatCurrency}
                  onNavigate={handleNavigate}
                />
              )}

              {/* This Month Summary Section */}
              {!searchQuery && (
                <ThisMonthSummarySection
                  summary={thisMonthSummary}
                  loading={loading}
                  formatCurrency={formatCurrency}
                />
              )}

              {/* Recent Activity Section */}
              {!searchQuery && (
                <RecentActivitySection
                  activities={recentActivities}
                  loading={loading}
                  onNavigate={handleNavigate}
                  getRelativeTime={getRelativeTime}
                />
              )}

              {/* Quotations & Invoices Section */}
              {!searchQuery && (
                <QuotationsInvoicesSection
                  invoiceStats={invoiceStats}
                  quotationStats={quotationStats}
                  selectedYear={selectedYear}
                  availableYears={availableYears}
                  onYearChange={setSelectedYear}
                  loading={loading}
                  formatCurrency={formatCurrency}
                  onNavigate={handleNavigate}
                />
              )}

              {/* Financial Health Section */}
              {!searchQuery && (
                <FinancialHealthSection
                  expenseStats={expenseStats}
                  extraExpenses={extraExpenses}
                  selectedYear={selectedFinancialYear}
                  availableYears={availableYears}
                  onYearChange={setSelectedFinancialYear}
                  loading={loading}
                  formatCurrency={formatCurrency}
                />
              )}

              {/* Financial Trends Section */}
              {!searchQuery && (
                <FinancialTrendsSection
                  trends={monthlyTrends}
                  selectedYear={selectedTrendsYear}
                  availableYears={availableYears}
                  onYearChange={setSelectedTrendsYear}
                  loading={loading}
                />
              )}

              {/* Products Overview Section */}
              {!searchQuery && (
                <ProductsOverviewSection
                  products={productExpenses}
                  showAllProducts={showAllProducts}
                  onToggleShowAll={() => setShowAllProducts(!showAllProducts)}
                  selectedYear={selectedProductsYear}
                  availableYears={availableYears}
                  onYearChange={setSelectedProductsYear}
                  loading={loading}
                  onNavigate={handleNavigate}
                />
              )}

              {/* Special Case Section */}
              {cardsBySection["Special Case"].length > 0 && (
                <CardsSection
                  cards={cardsBySection["Special Case"]}
                  sectionTitle="Special Case"
                  onNavigate={handleNavigate}
                />
              )}

              {/* Management Section */}
              {cardsBySection["Management"].length > 0 && (
                <CardsSection
                  cards={cardsBySection["Management"]}
                  sectionTitle="Management"
                  onNavigate={handleNavigate}
                />
              )}
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
