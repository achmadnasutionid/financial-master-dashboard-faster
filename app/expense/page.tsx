"use client"

import { useEffect, useState, memo, useCallback, Suspense } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { useRouter, useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Eye, Search, Loader2, Download } from "lucide-react"
import { ListCardSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Pagination } from "@/components/ui/pagination"
import { toast } from "sonner"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ExpenseItem {
  id: string
  productName: string
  budgeted: number
  actual: number
  difference: number
}

interface Expense {
  id: string
  expenseId: string
  projectName: string
  productionDate: string
  clientBudget: number
  paidAmount: number
  notes: string | null
  status: string
  items: ExpenseItem[]
  createdAt: string
  updatedAt: string
}

function ExpensePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Initialize statusFilter from URL parameter immediately
  const initialStatus = (() => {
    const statusParam = searchParams.get("status")
    if (statusParam && ["draft", "final"].includes(statusParam)) {
      return statusParam
    }
    return "all"
  })()
  
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)
  const [sortBy, setSortBy] = useState<string>("newest")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [exportYear, setExportYear] = useState<string>("")
  const [isExporting, setIsExporting] = useState(false)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  
  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const ITEMS_PER_PAGE = 20

  // Update filter if URL parameter changes
  useEffect(() => {
    const statusParam = searchParams.get("status")
    const newStatus = statusParam && ["draft", "final"].includes(statusParam) 
      ? statusParam 
      : "all"
    if (newStatus !== statusFilter) {
      setStatusFilter(newStatus)
    }
  }, [searchParams])

  const fetchExpenses = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      params.append("sortBy", sortBy)
      params.append("page", currentPage.toString())
      params.append("limit", ITEMS_PER_PAGE.toString())
      if (debouncedSearchQuery.trim()) params.append("search", debouncedSearchQuery.trim())

      const response = await fetch(`/api/expense?${params}`, { cache: 'no-store' })
      if (response.ok) {
        const result = await response.json()
        if (Array.isArray(result)) {
          setExpenses(result)
          setTotalPages(1)
          setTotalItems(result.length)
        } else {
          setExpenses(result.data || [])
          setTotalPages(result.pagination?.totalPages || 1)
          setTotalItems(result.pagination?.total || 0)
        }
      }
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sortBy, currentPage, debouncedSearchQuery, ITEMS_PER_PAGE])

  const fetchAvailableYears = async () => {
    try {
      const response = await fetch("/api/expense/years")
      if (response.ok) {
        const years = await response.json()
        setAvailableYears(years)
        // Set default export year to the most recent year with data
        if (years.length > 0 && !exportYear) {
          setExportYear(years[0].toString())
        }
      }
    } catch (error) {
      console.error("Error fetching available years:", error)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchExpenses()
  }, [fetchExpenses])

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery, statusFilter])

  // Refetch when page becomes visible (e.g., after navigation back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchExpenses()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', fetchExpenses)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', fetchExpenses)
    }
  }, [fetchExpenses])

  useEffect(() => {
    fetchAvailableYears()
  }, [])

  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId || isDeleting) return

    setIsDeleting(true)
    const idToDelete = deleteId
    setDeleteId(null)

    try {
      const response = await fetch(`/api/expense/${idToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Refresh the list FIRST, THEN show success toast
        await fetchExpenses()
        toast.success("Expense deleted", {
          description: "The expense has been removed."
        })
      } else {
        toast.error("Failed to delete expense", {
          description: "An error occurred while deleting."
        })
      }
    } catch (error) {
      console.error("Error deleting expense:", error)
      toast.error("Failed to delete expense", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExport = async () => {
    if (isExporting) return
    
    setIsExporting(true)
    try {
      const response = await fetch(`/api/expense/export?year=${exportYear}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `expenses-${exportYear}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast.success("Export successful", {
          description: `Expenses for ${exportYear} have been exported.`
        })
      } else {
        toast.error("Export failed", {
          description: "Could not export expenses."
        })
      }
    } catch (error) {
      console.error("Error exporting expenses:", error)
      toast.error("Export failed", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsExporting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Expenses" showBackButton={true} />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          {/* Header with filters and create button */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold tracking-tight">Expense List</h2>
              <div className="flex flex-wrap gap-2">
                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                  </SelectContent>
                </Select>

                {/* Create Button */}
                <Button onClick={() => router.push("/expense/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Expense
                </Button>
              </div>
            </div>

            {/* Export Section */}
            {availableYears.length > 0 && (
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Export:</span>
                <Select value={exportYear} onValueChange={setExportYear}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={handleExport}
                  disabled={isExporting || !exportYear}
                  className="gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isExporting ? "Exporting..." : "Export CSV"}
                </Button>
              </div>
            )}

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by expense ID or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Expense List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <ListCardSkeleton key={i} />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <Card>
              <CardContent className="py-0">
                <EmptyState
                  type="expenses"
                  isSearchResult={!!debouncedSearchQuery}
                  searchQuery={debouncedSearchQuery}
                  showAction={false}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {/* Header Row */}
              <div className="hidden lg:flex items-center justify-between gap-4 px-4 py-2 bg-muted/50 rounded-lg">
                <div className="flex-1 text-xs font-semibold text-muted-foreground uppercase">
                  Expense
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase" style={{ width: '100px' }}>
                    Status
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase" style={{ width: '90px' }}>
                    Date
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase text-right" style={{ width: '125px' }}>
                    Paid Amount
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase text-right" style={{ width: '125px' }}>
                    Difference
                  </div>
                </div>
                <div style={{ width: '220px' }} className="text-xs font-semibold text-muted-foreground uppercase text-center">
                  Actions
                </div>
              </div>

              {/* Data Rows */}
              {expenses.map((expense) => {
                const totalPaid = expense.paidAmount
                const totalActual = expense.items.reduce((sum, item) => sum + item.actual, 0)
                const totalDifference = totalPaid - totalActual

                return (
                  <Card key={expense.id} className="transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* Left: ID - Project Name */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-semibold text-sm whitespace-nowrap">
                            {expense.expenseId}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span className="font-medium text-sm truncate">
                            {expense.projectName}
                          </span>
                        </div>

                        {/* Middle: Status, Production Date, Paid Amount, Difference */}
                        <div className="hidden lg:flex items-center gap-4">
                          <div style={{ width: '100px' }}>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                expense.status === "final"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100"
                                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100"
                              }`}
                            >
                              {expense.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm font-medium" style={{ width: '90px' }}>
                            {new Date(expense.productionDate).toLocaleDateString('en-GB')}
                          </div>
                          <div className="text-sm font-semibold text-right" style={{ width: '125px' }}>
                            {formatCurrency(totalPaid)}
                          </div>
                          <div className={`text-sm font-medium text-right ${totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{ width: '125px' }}>
                            {formatCurrency(totalDifference)}
                          </div>
                        </div>

                        {/* Right: Action Buttons */}
                        <div className="flex items-center gap-1 justify-end" style={{ width: '220px' }}>
                          <Link href={`/expense/${expense.id}/view`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/expense/${expense.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          {/* Separator */}
                          <div className="h-8 w-px bg-border mx-1" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDeleteId(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              
              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !isDeleting && !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  )
}

export default function ExpensePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ExpensePageContent />
    </Suspense>
  )
}

