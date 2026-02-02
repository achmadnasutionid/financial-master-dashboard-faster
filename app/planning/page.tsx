"use client"

import { useEffect, useState, memo, useCallback, Suspense } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { PageHeader } from "@/components/layout/page-header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Eye, Search, FileText, Loader2 } from "lucide-react"
import { ListCardSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Pagination } from "@/components/ui/pagination"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PlanningItem {
  id: string
  productName: string
  budget: number
  expense: number
}

interface Planning {
  id: string
  planningId: string
  projectName: string
  clientName: string
  clientBudget: number
  notes: string | null
  status: string
  generatedQuotationId?: string
  items: PlanningItem[]
  createdAt: string
  updatedAt: string
}

function PlanningPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [plannings, setPlannings] = useState<Planning[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("newest")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  
  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const ITEMS_PER_PAGE = 20
  
  // Generate quotation state
  const [showQuotationDialog, setShowQuotationDialog] = useState(false)
  const [selectedPlanningId, setSelectedPlanningId] = useState<string | null>(null)
  const [selectedCompany, setSelectedCompany] = useState("")
  const [selectedBilling, setSelectedBilling] = useState("")
  const [selectedSignature, setSelectedSignature] = useState("")
  const [selectedPph, setSelectedPph] = useState("2")
  const [generatingQuotation, setGeneratingQuotation] = useState(false)
  
  // Master data
  const [companies, setCompanies] = useState<any[]>([])
  const [billings, setBillings] = useState<any[]>([])
  const [signatures, setSignatures] = useState<any[]>([])

  const fetchPlannings = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      params.append("sortBy", sortBy)
      params.append("page", currentPage.toString())
      params.append("limit", ITEMS_PER_PAGE.toString())
      if (debouncedSearchQuery.trim()) params.append("search", debouncedSearchQuery.trim())

      const response = await fetch(`/api/planning?${params}`, { cache: 'no-store' })
      if (response.ok) {
        const result = await response.json()
        if (Array.isArray(result)) {
          setPlannings(result)
          setTotalPages(1)
          setTotalItems(result.length)
        } else {
          setPlannings(result.data || [])
          setTotalPages(result.pagination?.totalPages || 1)
          setTotalItems(result.pagination?.total || 0)
        }
      }
    } catch (error) {
      console.error("Error fetching plannings:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchPlannings()
  }, [statusFilter, sortBy, currentPage, debouncedSearchQuery])

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery, statusFilter])

  // Refetch when page becomes visible (e.g., after navigation back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchPlannings()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', fetchPlannings)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', fetchPlannings)
    }
  }, [statusFilter, sortBy])

  // Fetch master data when dialog opens
  useEffect(() => {
    if (showQuotationDialog) {
      Promise.all([
        fetch("/api/companies").then(res => res.json()),
        fetch("/api/billings").then(res => res.json()),
        fetch("/api/signatures").then(res => res.json()),
      ]).then(([companiesData, billingsData, signaturesData]) => {
        setCompanies(companiesData)
        setBillings(billingsData)
        setSignatures(signaturesData)
      })
    }
  }, [showQuotationDialog])

  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId || isDeleting) return

    setIsDeleting(true)
    const idToDelete = deleteId
    setDeleteId(null)

    try {
      const response = await fetch(`/api/planning/${idToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Refresh the list FIRST, THEN show success toast
        await fetchPlannings()
        toast.success("Planning deleted", {
          description: "The planning has been removed."
        })
      } else {
        toast.error("Failed to delete planning", {
          description: "An error occurred while deleting."
        })
      }
    } catch (error) {
      console.error("Error deleting planning:", error)
      toast.error("Failed to delete planning", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleViewQuotation = async (quotationId: string) => {
    try {
      const res = await fetch(`/api/quotation/${quotationId}`)
      const quotationData = await res.json()
      
      if (quotationData.status === "accepted") {
        router.push(`/quotation/${quotationId}/view`)
      } else {
        router.push(`/quotation/${quotationId}/edit`)
      }
    } catch (error) {
      console.error("Error fetching quotation:", error)
      toast.error("Failed to load quotation")
    }
  }

  const handleGenerateQuotation = async () => {
    if (!selectedPlanningId || !selectedCompany || !selectedBilling || !selectedSignature) {
      toast.error("Please fill all required fields")
      return
    }

    setGeneratingQuotation(true)
    try {
      const response = await fetch(`/api/planning/${selectedPlanningId}/generate-quotation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompany,
          billingId: selectedBilling,
          signatureId: selectedSignature,
          pph: selectedPph
        })
      })

      if (response.ok) {
        const newQuotation = await response.json()
        toast.success("Quotation generated!", {
          description: "Redirecting to quotation edit page..."
        })
        
        // Update local planning state
        setPlannings(plannings.map(p => 
          p.id === selectedPlanningId 
            ? { ...p, generatedQuotationId: newQuotation.id }
            : p
        ))
        
        // Close dialog and redirect
        setShowQuotationDialog(false)
        setSelectedPlanningId(null)
        router.push(`/quotation/${newQuotation.id}/edit`)
      } else {
        const data = await response.json()
        toast.error("Failed to generate quotation", {
          description: data.error || "An error occurred."
        })
      }
    } catch (error) {
      console.error("Error generating quotation:", error)
      toast.error("Failed to generate quotation")
    } finally {
      setGeneratingQuotation(false)
    }
  }

  const calculateTotals = (items: PlanningItem[]) => {
    const totalBudget = items.reduce((sum, item) => sum + item.budget, 0)
    const totalExpense = items.reduce((sum, item) => sum + item.expense, 0)
    const totalProfit = totalBudget - totalExpense
    const margin = totalBudget > 0 ? (totalProfit / totalBudget) * 100 : 0
    return { totalBudget, totalExpense, totalProfit, margin }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="Planning" showBackButton={true} />
        <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
          <div className="container mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="h-7 w-40 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-10 w-32 animate-pulse rounded bg-muted" />
                <div className="h-10 w-32 animate-pulse rounded bg-muted" />
                <div className="h-10 w-40 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <ListCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Planning" showBackButton={true} />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          {/* Header with filters and create button */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold tracking-tight">Planning List</h2>
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
                <Link href="/planning/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Planning
                  </Button>
                </Link>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by Planning ID, Project Name, or Client Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Planning List */}
          {plannings.length === 0 ? (
            <Card>
              <CardContent className="py-0">
                <EmptyState
                  type="plannings"
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
                  Planning
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase" style={{ width: '100px' }}>
                    Status
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase" style={{ width: '90px' }}>
                    Date
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase text-right" style={{ width: '125px' }}>
                    Total Budget
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase text-right" style={{ width: '125px' }}>
                    Total Expense
                  </div>
                </div>
                <div style={{ width: '220px' }} className="text-xs font-semibold text-muted-foreground uppercase text-center">
                  Actions
                </div>
              </div>

              {/* Data Rows */}
              {plannings.map((planning) => {
                const { totalBudget, totalExpense } = calculateTotals(planning.items)
                return (
                  <Card key={planning.id} className="transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* Left: ID - Project Name */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-semibold text-sm whitespace-nowrap">
                            {planning.planningId}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span className="font-medium text-sm truncate">
                            {planning.projectName}
                          </span>
                        </div>

                        {/* Middle: Status, Production Date, Total Budget, Total Expense */}
                        <div className="hidden lg:flex items-center gap-4">
                          <div style={{ width: '100px' }}>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                planning.status === "final"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100"
                                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100"
                              }`}
                            >
                              {planning.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm font-medium" style={{ width: '90px' }}>
                            {new Date(planning.updatedAt).toLocaleDateString('en-GB')}
                          </div>
                          <div className="text-sm font-semibold text-right" style={{ width: '125px' }}>
                            {formatCurrency(totalBudget)}
                          </div>
                          <div className="text-sm font-medium text-right" style={{ width: '125px' }}>
                            {formatCurrency(totalExpense)}
                          </div>
                        </div>

                        {/* Right: Action Buttons */}
                        <div className="flex items-center gap-1 justify-end" style={{ width: '220px' }}>
                          {planning.status === "final" && planning.generatedQuotationId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleViewQuotation(planning.generatedQuotationId!)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          <Link href={`/planning/${planning.id}/view`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {planning.status !== "final" && (
                            <Link href={`/planning/${planning.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          {/* Separator */}
                          <div className="h-8 w-px bg-border mx-1" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDeleteId(planning.id)}
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
      <Footer />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !isDeleting && !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the planning
              and all its items.
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

      {/* Generate Quotation Dialog */}
      <Dialog open={showQuotationDialog} onOpenChange={setShowQuotationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Quotation</DialogTitle>
            <DialogDescription>
              Select company, billing, signature, and PPh to generate a quotation from this planning.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company <span className="text-destructive">*</span></Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Billing <span className="text-destructive">*</span></Label>
              <Select value={selectedBilling} onValueChange={setSelectedBilling}>
                <SelectTrigger>
                  <SelectValue placeholder="Select billing" />
                </SelectTrigger>
                <SelectContent>
                  {billings.map((billing) => (
                    <SelectItem key={billing.id} value={billing.id}>
                      {billing.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Signature <span className="text-destructive">*</span></Label>
              <Select value={selectedSignature} onValueChange={setSelectedSignature}>
                <SelectTrigger>
                  <SelectValue placeholder="Select signature" />
                </SelectTrigger>
                <SelectContent>
                  {signatures.map((signature) => (
                    <SelectItem key={signature.id} value={signature.id}>
                      {signature.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>PPh <span className="text-destructive">*</span></Label>
              <Select value={selectedPph} onValueChange={setSelectedPph}>
                <SelectTrigger>
                  <SelectValue placeholder="Select PPh" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% - No PPh</SelectItem>
                  <SelectItem value="0.5">0.5% - PPh Pasal 23</SelectItem>
                  <SelectItem value="2">2% - PPh Pasal 23</SelectItem>
                  <SelectItem value="3">3% - PPh Pasal 4 Ayat 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuotationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateQuotation} disabled={generatingQuotation}>
              {generatingQuotation ? "Generating..." : "Generate Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PlanningPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <PlanningPageContent />
    </Suspense>
  )
}

