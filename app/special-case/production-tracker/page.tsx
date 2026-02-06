"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export default function ProductionTrackerPage() {
  const [trackers, setTrackers] = useState<ProductionTracker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingCell, setEditingCell] = useState<{rowId: string, field: string} | null>(null)
  const [editValue, setEditValue] = useState<any>("")
  const [creating, setCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

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
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.append("search", searchQuery.trim())

      const response = await fetch(`/api/production-tracker?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTrackers(data)
      }
    } catch (error) {
      console.error("Error fetching trackers:", error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    setLoading(true)
    fetchTrackers()
  }, [fetchTrackers])

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
          productAmounts: {}
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

  const handleCellClick = (tracker: ProductionTracker, field: string) => {
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
      <PageHeader title="Production Tracker" showBackButton={true} />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-6">
        <div className="w-full max-w-[98vw] mx-auto space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by ID, Expense ID, or Project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={handleCreateRow} disabled={creating}>
              <Plus className="mr-2 h-4 w-4" />
              {creating ? "Creating..." : "New Row"}
            </Button>
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
                    Tracker ID
                  </th>
                  <th className="sticky left-[110px] z-40 border-r border-b border-border p-2 text-left font-semibold min-w-[110px] bg-gray-100">
                    Expense ID
                  </th>
                  
                  {/* Project Info - Blue */}
                  <th className="sticky left-[220px] z-40 border-r border-b border-border p-2 text-left font-semibold min-w-[180px] bg-blue-50">
                    Project Name
                  </th>
                  <th className="sticky left-[400px] z-40 border-r border-b border-border p-2 text-left font-semibold min-w-[85px] bg-blue-50">
                    Date
                  </th>
                  
                  {/* Financial Summary - Green */}
                  <th className="sticky left-[485px] z-40 border-r border-b border-border p-2 text-left font-semibold w-[140px] min-w-[140px] bg-green-50">
                    Subtotal
                  </th>
                  <th className="sticky left-[625px] z-40 border-r border-b border-border p-2 text-left font-semibold w-[140px] min-w-[140px] bg-green-50">
                    Total
                  </th>
                  
                  {/* Calculated Columns - Yellow/Orange */}
                  <th className="sticky left-[765px] z-40 border-r border-b border-border p-2 text-left font-semibold w-[140px] min-w-[140px] bg-amber-50">
                    Expense
                  </th>
                  <th className="sticky left-[905px] z-40 border-r border-b border-border p-2 text-left font-semibold w-[140px] min-w-[140px] bg-amber-50 shadow-[2px_0_4px_rgba(0,0,0,0.1)] whitespace-nowrap">
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
                  
                  {/* Action Column - Red */}
                  <th className="sticky right-0 z-40 border-l-2 border-b border-border p-2 text-center font-semibold min-w-[60px] bg-red-50 shadow-[-2px_0_4px_rgba(0,0,0,0.1)]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {trackers.length === 0 ? (
                  <tr>
                    <td colSpan={PRODUCT_COLUMNS.length + 8} className="p-8 text-center text-muted-foreground">
                      No data yet. Click "New Row" to start.
                    </td>
                  </tr>
                ) : (
                  trackers.map((tracker) => {
                    return (
                      <tr key={tracker.id} className="transition-colors hover:bg-muted/30">
                        {/* Tracker ID - Not editable - Gray */}
                        <td className="sticky left-0 z-20 border-r border-b border-border p-2 text-xs bg-gray-50 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                          {tracker.trackerId}
                        </td>
                        
                        {/* Expense ID - Editable - Gray */}
                        <td 
                          className="sticky left-[110px] z-20 border-r border-b border-border p-2 bg-gray-50 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleCellClick(tracker, 'expenseId')}
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
                          className="sticky left-[220px] z-20 border-r border-b border-border p-2 bg-blue-50 cursor-pointer hover:bg-blue-100"
                          onClick={() => handleCellClick(tracker, 'projectName')}
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
                          className="sticky left-[400px] z-20 border-r border-b border-border p-2 bg-blue-50 cursor-pointer hover:bg-blue-100"
                          onClick={() => handleCellClick(tracker, 'date')}
                        >
                          {editingCell?.rowId === tracker.id && editingCell?.field === 'date' ? (
                            <Input
                              type="date"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleBlur}
                              onKeyDown={handleKeyDown}
                              className="h-7 text-xs"
                              autoFocus
                            />
                          ) : (
                            <span className="text-xs">{formatDate(tracker.date)}</span>
                          )}
                        </td>
                        
                        {/* Subtotal - Editable - Green */}
                        <td 
                          className="sticky left-[485px] z-20 border-r border-b border-border p-2 text-right bg-green-50 cursor-pointer hover:bg-green-100 w-[140px] min-w-[140px]"
                          onClick={() => handleCellClick(tracker, 'subtotal')}
                        >
                          {editingCell?.rowId === tracker.id && editingCell?.field === 'subtotal' ? (
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleBlur}
                              onKeyDown={handleKeyDown}
                              className="h-7 text-xs text-right w-full"
                              placeholder="0"
                              autoFocus
                            />
                          ) : (
                            <span className="text-xs font-medium">{formatCurrency(tracker.subtotal)}</span>
                          )}
                        </td>
                        
                        {/* Total Amount - Editable - Green */}
                        <td 
                          className="sticky left-[625px] z-20 border-r border-b border-border p-2 text-right bg-green-50 cursor-pointer hover:bg-green-100 w-[140px] min-w-[140px]"
                          onClick={() => handleCellClick(tracker, 'totalAmount')}
                        >
                          {editingCell?.rowId === tracker.id && editingCell?.field === 'totalAmount' ? (
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleBlur}
                              onKeyDown={handleKeyDown}
                              className="h-7 text-xs text-right w-full"
                              placeholder="0"
                              autoFocus
                            />
                          ) : (
                            <span className="text-xs font-medium">{formatCurrency(tracker.totalAmount)}</span>
                          )}
                        </td>
                        
                        {/* Expense - Calculated (Non-editable) - Amber */}
                        <td 
                          className="sticky left-[765px] z-20 border-r border-b border-border p-2 text-right bg-amber-50 w-[140px] min-w-[140px]"
                        >
                          <span className="text-xs font-medium text-amber-700">
                            {formatCurrency(calculateExpense(tracker.productAmounts || {}))}
                          </span>
                        </td>
                        
                        {/* PHOTOGRAPHER - Calculated (Non-editable) - Amber */}
                        <td 
                          className="sticky left-[905px] z-20 border-r border-b border-border p-2 text-right bg-amber-50 shadow-[2px_0_4px_rgba(0,0,0,0.05)] w-[140px] min-w-[140px]"
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
                              onClick={() => handleCellClick(tracker, fieldName)}
                            >
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleBlur}
                                  onKeyDown={handleKeyDown}
                                  className="h-7 text-xs text-right w-full"
                                  placeholder="0"
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
                        
                        {/* Action Column - Sticky Right - Red */}
                        <td className="sticky right-0 z-20 border-l-2 border-b border-border p-2 text-center bg-red-50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
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
