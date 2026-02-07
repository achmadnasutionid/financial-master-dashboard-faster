"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { NumericFormat } from "react-number-format"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Search, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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

interface ProductionTracker {
  id: string
  trackerId: string
  expenseId: string
  invoiceId?: string | null
  projectName: string
  date: string
  subtotal: number
  totalAmount: number
  expense: number
  productAmounts: Record<string, number>
  notes?: string | null
  status: string
  createdAt: string
  updatedAt: string
}

const PRODUCT_COLUMNS = [
  "PHOTOGRAPHER",
  "PROPS/SET",
  "VIDEOGRAPHER",
  "RETOUCHER",
  "MUA HAIR",
  "MODEL/HANDMODEL",
  "STUDIO/LIGHTING",
  "FASHION STYLIST",
  "GRAFFER",
  "MANAGER",
  "FOOD & DRINK",
  "ACCOMMODATION",
  "PRINT"
]

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { value: "in progress", label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "paid", label: "Paid", color: "bg-green-50 text-green-700 border-green-200" }
]

export default function ProductionTrackerPage() {
  const [trackers, setTrackers] = useState<ProductionTracker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [editingCell, setEditingCell] = useState<{rowId: string, field: string} | null>(null)
  const [editValue, setEditValue] = useState<any>("")
  const [creating, setCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)
  const isClickingCell = useRef(false)

  // Calculate expense from all product columns except PHOTOGRAPHER
  const calculateExpense = (productAmounts: Record<string, number>) => {
    const expenseProducts = PRODUCT_COLUMNS.slice(1) // All except PHOTOGRAPHER
    return expenseProducts.reduce((sum, product) => {
      return sum + (productAmounts[product] || 0)
    }, 0)
  }

  // Calculate PHOTOGRAPHER from Total - Expense
  const calculatePhotographer = (totalAmount: number, productAmounts: Record<string, number>) => {
    const expense = calculateExpense(productAmounts)
    return totalAmount - expense
  }

  // Hide number input arrows/spinners
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'hide-number-spinners'
    style.textContent = `
      input[type=number]::-webkit-inner-spin-button,
      input[type=number]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      input[type=number] {
        -moz-appearance: textfield;
        appearance: textfield;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById('hide-number-spinners')
      if (existingStyle) {
        document.head.removeChild(existingStyle)
      }
    }
  }, [])

  const fetchTrackers = useCallback(async () => {
    try {
      const response = await fetch(`/api/production-tracker`)
      if (response.ok) {
        const data = await response.json()
        setTrackers(data)
      }
    } catch (error) {
      console.error("Error fetching trackers:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount only
  useEffect(() => {
    fetchTrackers()
  }, [fetchTrackers])

  // Extract available years from trackers
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    trackers.forEach(tracker => {
      const year = new Date(tracker.date).getFullYear()
      if (!isNaN(year)) years.add(year)
    })
    return Array.from(years).sort((a, b) => b - a) // Sort descending (newest first)
  }, [trackers])

  // Filter by year first, then by search query
  const filteredTrackers = useMemo(() => {
    let filtered = trackers

    // Filter by year
    if (selectedYear !== "all") {
      filtered = filtered.filter(tracker => {
        const year = new Date(tracker.date).getFullYear()
        return year.toString() === selectedYear
      })
    }

    // Then filter by search query (expense ID or project name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(tracker =>
        tracker.expenseId.toLowerCase().includes(query) ||
        tracker.projectName.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [trackers, selectedYear, searchQuery])

  const handleCreateRow = async () => {
    if (creating) return
    
    setCreating(true)
    try {
      const response = await fetch("/api/production-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseId: "",
          projectName: "",
          date: new Date().toISOString(),
          subtotal: 0,
          totalAmount: 0,
          expense: 0, // Will be 0 since all products start at 0
          productAmounts: {},
          status: "pending"
        })
      })

      if (response.ok) {
        const newTracker = await response.json()
        setTrackers([newTracker, ...trackers])
        toast.success("New row created")
      } else {
        toast.error("Failed to create row")
      }
    } catch (error) {
      console.error("Error creating row:", error)
      toast.error("Failed to create row")
    } finally {
      setCreating(false)
    }
  }

  const handleCellClick = async (tracker: ProductionTracker, field: string) => {
    // If we're currently editing another cell, save it first
    if (editingCell && (editingCell.rowId !== tracker.id || editingCell.field !== field)) {
      isClickingCell.current = true
      await handleCellBlur()
      isClickingCell.current = false
    }
    
    // Don't allow editing status via cell click (use dropdown instead)
    if (field === 'status') return
    
    setEditingCell({ rowId: tracker.id, field })
    
    // Set initial value based on field type
    if (field.startsWith('product_')) {
      const productName = field.replace('product_', '')
      setEditValue(tracker.productAmounts?.[productName] || "")
    } else if (field === 'date') {
      setEditValue(tracker.date ? new Date(tracker.date).toISOString().split('T')[0] : "")
    } else {
      setEditValue((tracker as any)[field] || "")
    }
  }

  const handleStatusChange = async (trackerId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/production-tracker/${trackerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const updated = await response.json()
        setTrackers(trackers.map(t => t.id === trackerId ? updated : t))
        toast.success("Status updated")
      } else {
        toast.error("Failed to update status")
      }
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Failed to update status")
    }
  }

  const handleCellBlur = async () => {
    if (!editingCell) return

    const { rowId, field } = editingCell
    const tracker = trackers.find(t => t.id === rowId)
    if (!tracker) return

    // Check if value actually changed
    let hasChanged = false
    if (field.startsWith('product_')) {
      const productName = field.replace('product_', '')
      const currentValue = tracker.productAmounts?.[productName] || 0
      const newValue = parseFloat(editValue) || 0
      hasChanged = currentValue !== newValue
    } else if (field === 'date') {
      const currentValue = tracker.date ? new Date(tracker.date).toISOString().split('T')[0] : ""
      hasChanged = currentValue !== editValue
    } else {
      hasChanged = (tracker as any)[field] !== editValue
    }

    if (!hasChanged) {
      setEditingCell(null)
      return
    }

    // Save the change
    try {
      let updateData: any = {}
      
      if (field.startsWith('product_')) {
        const productName = field.replace('product_', '')
        updateData.productAmounts = {
          ...tracker.productAmounts,
          [productName]: parseFloat(editValue) || 0
        }
        // Recalculate expense
        updateData.expense = calculateExpense(updateData.productAmounts)
        // Recalculate PHOTOGRAPHER
        const photographer = calculatePhotographer(tracker.totalAmount, updateData.productAmounts)
        updateData.productAmounts['PHOTOGRAPHER'] = photographer
      } else if (field === 'subtotal' || field === 'totalAmount') {
        updateData[field] = parseFloat(editValue) || 0
        // If totalAmount changed, recalculate PHOTOGRAPHER
        if (field === 'totalAmount') {
          const photographer = calculatePhotographer(parseFloat(editValue) || 0, tracker.productAmounts || {})
          updateData.productAmounts = {
            ...tracker.productAmounts,
            'PHOTOGRAPHER': photographer
          }
          updateData.expense = calculateExpense(tracker.productAmounts || {})
        }
      } else if (field === 'date') {
        updateData[field] = editValue ? new Date(editValue).toISOString() : tracker.date
      } else {
        updateData[field] = editValue
      }

      const response = await fetch(`/api/production-tracker/${rowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const updated = await response.json()
        setTrackers(trackers.map(t => t.id === rowId ? updated : t))
        toast.success("Saved")
      } else {
        toast.error("Failed to save")
      }
    } catch (error) {
      console.error("Error saving cell:", error)
      toast.error("Failed to save")
    }

    setEditingCell(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCellBlur()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  const handleDeleteRow = async (id: string) => {
    setDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!deleteId || deleting) return

    setDeleting(true)
    const idToDelete = deleteId

    try {
      const response = await fetch(`/api/production-tracker/${idToDelete}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setTrackers(trackers.filter(t => t.id !== idToDelete))
        if (editingCell?.rowId === idToDelete) {
          setEditingCell(null)
        }
        toast.success("Row deleted")
      } else {
        toast.error("Failed to delete row")
      }
    } catch (error) {
      console.error("Error deleting row:", error)
      toast.error("Failed to delete row")
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const handleBlur = () => {
    if (editingCell) {
      handleCellBlur()
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    handleDeleteRow(id)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="Production Tracker" showBackButton={true} />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Production Tracker" showBackButton={true} hideThemeToggle={true} />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-6">
        <div className="w-full max-w-[98vw] mx-auto space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by Expense ID or Project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="ml-auto flex items-center gap-3">
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
              <Button onClick={handleCreateRow} disabled={creating}>
                <Plus className="mr-2 h-4 w-4" />
                {creating ? "Creating..." : "New Row"}
              </Button>
            </div>
          </div>

          {/* Full-width Table with Extended Sticky Columns */}
          <div 
            ref={tableRef}
            className="relative overflow-x-auto overflow-y-auto rounded-lg border bg-card shadow-lg max-h-[calc(100vh-250px)]"
          >
            <table className="w-full border-collapse text-xs border-separate border-spacing-0">
              <thead className="sticky top-0 z-30 bg-muted">
                <tr>
                  {/* ID Columns - Gray */}
                  <th className="sticky left-0 z-40 border-r border-b border-border p-2 text-left font-semibold min-w-[110px] bg-gray-100 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                    Expense ID
                  </th>
                  
                  {/* Project Info - Blue */}
                  <th className="sticky left-[110px] z-40 border-r border-b border-border p-2 text-left font-semibold min-w-[180px] bg-blue-50">
                    Project Name
                  </th>
                  <th className="sticky left-[290px] z-40 border-r border-b border-border p-2 text-left font-semibold w-[180px] min-w-[180px] bg-blue-50">
                    Date
                  </th>
                  
                  {/* Financial Summary - Green */}
                  <th className="sticky left-[470px] z-40 border-r border-b border-border p-2 text-left font-semibold w-[140px] min-w-[140px] bg-green-50">
                    Subtotal
                  </th>
                  <th className="sticky left-[610px] z-40 border-r border-b border-border p-2 text-left font-semibold w-[140px] min-w-[140px] bg-green-50">
                    Total
                  </th>
                  
                  {/* Calculated Columns - Yellow/Orange */}
                  <th className="sticky left-[750px] z-40 border-r border-b border-border p-2 text-left font-semibold w-[140px] min-w-[140px] bg-amber-50">
                    Expense
                  </th>
                  <th className="sticky left-[890px] z-40 border-r border-b border-border p-2 text-left font-semibold w-[140px] min-w-[140px] bg-amber-50 shadow-[2px_0_4px_rgba(0,0,0,0.1)] whitespace-nowrap">
                    PHOTOGRAPHER
                  </th>
                  
                  {/* Product Columns - Purple */}
                  {PRODUCT_COLUMNS.slice(1).map((product, index) => (
                    <th key={product} className={cn(
                      "border-r border-b border-border p-2 text-left font-semibold w-[140px] min-w-[140px] whitespace-nowrap bg-purple-50",
                      index === PRODUCT_COLUMNS.slice(1).length - 1 && "border-r-2"
                    )}>
                      {product}
                    </th>
                  ))}
                  
                  {/* Status Column - Sticky Right - Red */}
                  <th className="sticky right-[60px] z-40 border-r border-b border-border p-2 text-center font-semibold min-w-[140px] bg-red-50 shadow-[-2px_0_4px_rgba(0,0,0,0.1)]">
                    Status
                  </th>
                  
                  {/* Action Column - Red (no left border for unified look) */}
                  <th className="sticky right-0 z-40 border-b border-border p-2 text-center font-semibold min-w-[60px] bg-red-50">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Skeleton loading rows
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      {/* Expense ID - Gray */}
                      <td className="sticky left-0 z-20 border-r border-b border-border p-2 bg-gray-50 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                        <Skeleton className="h-5 w-full" />
                      </td>
                      {/* Project Name - Blue */}
                      <td className="sticky left-[110px] z-20 border-r border-b border-border p-2 bg-blue-50">
                        <Skeleton className="h-5 w-full" />
                      </td>
                      {/* Date - Blue */}
                      <td className="sticky left-[290px] z-20 border-r border-b border-border p-2 bg-blue-50 w-[180px] min-w-[180px]">
                        <Skeleton className="h-5 w-full" />
                      </td>
                      {/* Subtotal - Green */}
                      <td className="sticky left-[470px] z-20 border-r border-b border-border p-2 bg-green-50 w-[140px] min-w-[140px]">
                        <Skeleton className="h-5 w-full" />
                      </td>
                      {/* Total - Green */}
                      <td className="sticky left-[610px] z-20 border-r border-b border-border p-2 bg-green-50 w-[140px] min-w-[140px]">
                        <Skeleton className="h-5 w-full" />
                      </td>
                      {/* Expense - Amber */}
                      <td className="sticky left-[750px] z-20 border-r border-b border-border p-2 bg-amber-50 w-[140px] min-w-[140px]">
                        <Skeleton className="h-5 w-full" />
                      </td>
                      {/* PHOTOGRAPHER - Amber */}
                      <td className="sticky left-[890px] z-20 border-r border-b border-border p-2 bg-amber-50 w-[140px] min-w-[140px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                        <Skeleton className="h-5 w-full" />
                      </td>
                      {/* Product Columns - Purple */}
                      {PRODUCT_COLUMNS.slice(1).map((product, idx) => (
                        <td key={product} className={cn(
                          "border-r border-b border-border p-2 bg-purple-50 w-[140px] min-w-[140px]",
                          idx === PRODUCT_COLUMNS.slice(1).length - 1 && "border-r-2"
                        )}>
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                      {/* Status Column - Red */}
                      <td className="sticky right-[60px] z-20 border-r border-b border-border p-2 bg-red-50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                        <Skeleton className="h-5 w-full" />
                      </td>
                      {/* Action Column - Red (no left border) */}
                      <td className="sticky right-0 z-20 border-b border-border p-2 bg-red-50">
                        <Skeleton className="h-5 w-5 mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : trackers.length === 0 ? (
                  <tr>
                    <td colSpan={PRODUCT_COLUMNS.length + 8} className="p-8 text-center text-muted-foreground">
                      No data yet. Click "New Row" to start.
                    </td>
                  </tr>
                ) : (
                  filteredTrackers.map((tracker) => {
                    return (
                      <tr key={tracker.id} className="transition-colors hover:bg-muted/30">
                        {/* Expense ID - Editable - Gray */}
                        <td 
                          className="sticky left-0 z-20 border-r border-b border-border p-2 bg-gray-50 cursor-pointer hover:bg-gray-100 shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleCellClick(tracker, 'expenseId')
                          }}
                        >
                          {editingCell?.rowId === tracker.id && editingCell?.field === 'expenseId' ? (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleBlur}
                              onKeyDown={handleKeyDown}
                              className="h-7 text-xs"
                              autoFocus
                            />
                          ) : (
                            <span className="text-xs">{tracker.expenseId || "-"}</span>
                          )}
                        </td>
                        
                        {/* Project Name - Editable - Blue */}
                        <td 
                          className="sticky left-[110px] z-20 border-r border-b border-border p-2 bg-blue-50 cursor-pointer hover:bg-blue-100"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleCellClick(tracker, 'projectName')
                          }}
                        >
                          {editingCell?.rowId === tracker.id && editingCell?.field === 'projectName' ? (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleBlur}
                              onKeyDown={handleKeyDown}
                              className="h-7 text-xs"
                              autoFocus
                            />
                          ) : (
                            <span className="text-xs">{tracker.projectName || "-"}</span>
                          )}
                        </td>
                        
                        {/* Date - Editable - Blue */}
                        <td 
                          className="sticky left-[290px] z-20 border-r border-b border-border p-2 bg-blue-50 cursor-pointer hover:bg-blue-100 w-[180px] min-w-[180px]"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleCellClick(tracker, 'date')
                          }}
                        >
                          {editingCell?.rowId === tracker.id && editingCell?.field === 'date' ? (
                            <Input
                              type="date"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleBlur}
                              onKeyDown={handleKeyDown}
                              className="h-7 text-xs w-full"
                              autoFocus
                            />
                          ) : (
                            <span className="text-xs">{formatDate(tracker.date)}</span>
                          )}
                        </td>
                        
                        {/* Subtotal - Editable - Green */}
                        <td 
                          className="sticky left-[470px] z-20 border-r border-b border-border p-2 text-right bg-green-50 cursor-pointer hover:bg-green-100 w-[140px] min-w-[140px]"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleCellClick(tracker, 'subtotal')
                          }}
                        >
                          {editingCell?.rowId === tracker.id && editingCell?.field === 'subtotal' ? (
                            <NumericFormat
                              value={editValue}
                              onValueChange={(values) => setEditValue(values.value)}
                              onBlur={handleBlur}
                              onKeyDown={handleKeyDown}
                              thousandSeparator="."
                              decimalSeparator=","
                              decimalScale={0}
                              allowNegative={false}
                              placeholder="0"
                              className="flex h-7 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-right ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              autoFocus
                            />
                          ) : (
                            <span className="text-xs font-medium">{formatCurrency(tracker.subtotal)}</span>
                          )}
                        </td>
                        
                        {/* Total Amount - Editable - Green */}
                        <td 
                          className="sticky left-[610px] z-20 border-r border-b border-border p-2 text-right bg-green-50 cursor-pointer hover:bg-green-100 w-[140px] min-w-[140px]"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleCellClick(tracker, 'totalAmount')
                          }}
                        >
                          {editingCell?.rowId === tracker.id && editingCell?.field === 'totalAmount' ? (
                            <NumericFormat
                              value={editValue}
                              onValueChange={(values) => setEditValue(values.value)}
                              onBlur={handleBlur}
                              onKeyDown={handleKeyDown}
                              thousandSeparator="."
                              decimalSeparator=","
                              decimalScale={0}
                              allowNegative={false}
                              placeholder="0"
                              className="flex h-7 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-right ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              autoFocus
                            />
                          ) : (
                            <span className="text-xs font-medium">{formatCurrency(tracker.totalAmount)}</span>
                          )}
                        </td>
                        
                        {/* Expense - Calculated (Non-editable) - Amber */}
                        <td 
                          className="sticky left-[750px] z-20 border-r border-b border-border p-2 text-right bg-amber-50 w-[140px] min-w-[140px]"
                        >
                          <span className="text-xs font-medium text-amber-700">
                            {formatCurrency(calculateExpense(tracker.productAmounts || {}))}
                          </span>
                        </td>
                        
                        {/* PHOTOGRAPHER - Calculated (Non-editable) - Amber */}
                        <td 
                          className="sticky left-[890px] z-20 border-r border-b border-border p-2 text-right bg-amber-50 shadow-[2px_0_4px_rgba(0,0,0,0.05)] w-[140px] min-w-[140px]"
                        >
                          <span className="text-xs font-medium text-amber-700">
                            {formatCurrency(calculatePhotographer(tracker.totalAmount, tracker.productAmounts || {}))}
                          </span>
                        </td>
                        
                        {/* Scrollable Product Columns - Purple */}
                        {PRODUCT_COLUMNS.slice(1).map((product, index) => {
                          const amount = tracker.productAmounts?.[product] || 0
                          const fieldName = `product_${product}`
                          const isEditing = editingCell?.rowId === tracker.id && editingCell?.field === fieldName
                          
                          return (
                            <td 
                              key={product}
                              className={cn(
                                "border-r border-b border-border p-2 text-right bg-purple-50 cursor-pointer hover:bg-purple-100 w-[140px] min-w-[140px]",
                                index === PRODUCT_COLUMNS.slice(1).length - 1 && "border-r-2"
                              )}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                handleCellClick(tracker, fieldName)
                              }}
                            >
                              {isEditing ? (
                                <NumericFormat
                                  value={editValue}
                                  onValueChange={(values) => setEditValue(values.value)}
                                  onBlur={handleBlur}
                                  onKeyDown={handleKeyDown}
                                  thousandSeparator="."
                                  decimalSeparator=","
                                  decimalScale={0}
                                  allowNegative={false}
                                  placeholder="0"
                                  className="flex h-7 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-right ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  autoFocus
                                />
                              ) : (
                                <span className={cn("text-xs", amount > 0 ? "font-medium" : "text-muted-foreground")}>
                                  {amount > 0 ? formatCurrency(amount) : "-"}
                                </span>
                              )}
                            </td>
                          )
                        })}
                        
                        {/* Status Column - Sticky Right - Red */}
                        <td className="sticky right-[60px] z-20 border-r border-b border-border p-2 text-center bg-red-50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                          <Select value={tracker.status} onValueChange={(value) => handleStatusChange(tracker.id, value)}>
                            <SelectTrigger className={cn(
                              "h-7 text-xs border",
                              STATUS_OPTIONS.find(s => s.value === tracker.status)?.color
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  <span className={cn("px-2 py-1 rounded", status.color)}>
                                    {status.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        
                        {/* Action Column - Sticky Right - Red (no left border for unified look) */}
                        <td className="sticky right-0 z-20 border-b border-border p-2 text-center bg-red-50">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-red-100"
                            onClick={(e) => handleDeleteClick(e, tracker.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* No search results message - outside table, centered */}
          {!loading && trackers.length > 0 && filteredTrackers.length === 0 && searchQuery.trim() && (
            <div className="text-center py-8 text-muted-foreground">
              No trackers found matching your search.
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !deleting && !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Row?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this production tracker entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? (
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
    </div>
  )
}
