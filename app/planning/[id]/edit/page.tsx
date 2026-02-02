"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Plus, Trash2, Save, CheckCircle } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { scrollToFirstError } from "@/lib/form-utils"

interface PlanningItem {
  id: string
  productName: string
  budget: string
  expense: string
}

export default function EditPlanningPage() {
  const router = useRouter()
  const params = useParams()
  const planningId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [projectName, setProjectName] = useState("")
  const [clientName, setClientName] = useState("")
  const [clientBudget, setClientBudget] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<PlanningItem[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const initialDataRef = useRef<string>("")
  const [products, setProducts] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<any>({})
  const [planningNumber, setPlanningNumber] = useState<string>("")
  const [planningStatus, setPlanningStatus] = useState<string>("")
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Refs for error scrolling
  const projectNameRef = useRef<HTMLDivElement>(null)
  const clientNameRef = useRef<HTMLDivElement>(null)

  // Fetch planning data
  useEffect(() => {
    if (!planningId) return

    fetch(`/api/planning/${planningId}`)
      .then((res) => res.json())
      .then((data) => {
        // Check if planning is finalized
        if (data.status === "final") {
          toast.error("Cannot edit finalized planning", {
            description: "This planning has been finalized and cannot be edited."
          })
          router.push("/planning")
          return
        }

        setPlanningNumber(data.planningId)
        setPlanningStatus(data.status)
        setProjectName(data.projectName)
        setClientName(data.clientName)
        setClientBudget(data.clientBudget.toString())
        setNotes(data.notes || "")
        setItems(
          data.items.map((item: any) => ({
            id: item.id,
            productName: item.productName,
            budget: item.budget.toString(),
            expense: item.expense.toString(),
          }))
        )
        setLoading(false)
        
        // Store initial data snapshot for change detection
        initialDataRef.current = JSON.stringify({
          projectName: data.projectName,
          clientName: data.clientName,
          clientBudget: data.clientBudget,
          notes: data.notes || "",
          items: data.items
        })
      })
      .catch((error) => {
        console.error("Error fetching planning:", error)
        toast.error("Failed to load planning", {
          description: "An error occurred while loading the planning."
        })
        setLoading(false)
      })
  }, [planningId, router])

  // Fetch products for dropdown
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.map((p: any) => p.name)))
      .catch(console.error)
  }, [])

  // Track changes
  useEffect(() => {
    if (loading || !initialDataRef.current) return
    
    const currentData = JSON.stringify({
      projectName,
      clientName,
      clientBudget: parseFloat(clientBudget) || 0,
      notes,
      items: items.map(item => ({
        id: item.id,
        productName: item.productName,
        budget: item.budget,
        expense: item.expense
      }))
    })
    
    setHasUnsavedChanges(currentData !== initialDataRef.current)
  }, [projectName, clientName, clientBudget, notes, items, loading])

  // Unsaved changes dialog
  const {
    showDialog: showUnsavedDialog,
    setShowDialog: setShowUnsavedDialog,
    isSaving: isSavingDraft,
    interceptNavigation,
    handleSaveAndLeave,
    handleLeaveWithoutSaving
  } = useUnsavedChanges({
    hasUnsavedChanges,
    onSave: async () => {
      // Save with current status, don't force to draft
      await handleSubmit((planningStatus as "draft" | "final") || "draft")
    },
    enabled: !loading
  })

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        productName: "",
        budget: "",
        expense: "",
      },
    ])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: string, value: string) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  const calculateItemProfit = (budget: string, expense: string) => {
    const b = parseFloat(budget) || 0
    const e = parseFloat(expense) || 0
    return b - e
  }

  const calculateTotals = () => {
    const totalBudget = items.reduce(
      (sum, item) => sum + (parseFloat(item.budget) || 0),
      0
    )
    const totalExpense = items.reduce(
      (sum, item) => sum + (parseFloat(item.expense) || 0),
      0
    )
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

  const validateField = (field: string, value: string) => {
    const fieldErrors: any = { ...errors }
    
    switch (field) {
      case "projectName":
        if (!value.trim()) {
          fieldErrors.projectName = "Project name is required"
        } else {
          delete fieldErrors.projectName
        }
        break
      case "clientName":
        if (!value.trim()) {
          fieldErrors.clientName = "Client name is required"
        } else {
          delete fieldErrors.clientName
        }
        break
      case "clientBudget":
        if (!value || parseFloat(value) <= 0) {
          fieldErrors.clientBudget = "Valid client budget is required"
        } else {
          delete fieldErrors.clientBudget
        }
        break
    }
    
    setErrors(fieldErrors)
  }

  const validateForm = () => {
    const newErrors: any = {}
    if (!projectName.trim()) newErrors.projectName = "Project name is required"
    if (!clientName.trim()) newErrors.clientName = "Client name is required"
    if (!clientBudget || parseFloat(clientBudget) <= 0)
      newErrors.clientBudget = "Valid client budget is required"

    setErrors(newErrors)
    
    // Scroll to first error
    if (Object.keys(newErrors).length > 0) {
      scrollToFirstError(newErrors, {
        projectName: projectNameRef,
        clientName: clientNameRef,
      })
    }
    
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (status: "draft" | "final") => {
    if (saving) return
    if (!validateForm()) return

    // Additional validation for finalizing
    if (status === "final") {
      // Check if there are any items
      if (items.length === 0) {
        toast.warning("Cannot finalize planning", {
          description: "Please add at least one item before finalizing."
        })
        return
      }

      // Check if all items have product names
      const emptyProducts = items.filter(item => !item.productName.trim())
      if (emptyProducts.length > 0) {
        toast.warning("Cannot finalize planning", {
          description: "All items must have a product name filled in."
        })
        return
      }

      // Check if total budget equals client budget
      const { totalBudget } = calculateTotals()
      const clientBudgetValue = parseFloat(clientBudget)
      if (Math.abs(totalBudget - clientBudgetValue) > 0.01) {
        toast.warning("Cannot finalize planning", {
          description: `Total budget (${formatCurrency(totalBudget)}) must equal client budget (${formatCurrency(clientBudgetValue)}).`
        })
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        projectName,
        clientName,
        clientBudget: parseFloat(clientBudget),
        notes,
        items: items.map((item) => ({
          productName: item.productName,
          budget: parseFloat(item.budget) || 0,
          expense: parseFloat(item.expense) || 0,
        })),
        status,
      }

      const response = await fetch(`/api/planning/${planningId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Planning updated successfully", {
          description: `Planning has been ${status === "final" ? "finalized" : "saved as draft"}.`
        })
        
        // Clear unsaved changes flag
        setHasUnsavedChanges(false)
        
        // Redirect to view page if finalized, otherwise go to list
        if (status === "final") {
          router.push(`/planning/${planningId}/view`)
        } else {
          router.push("/planning")
        }
      } else {
        const data = await response.json()
        toast.error("Failed to update planning", {
          description: data.error || "An error occurred while updating."
        })
      }
    } catch (error) {
      console.error("Error updating planning:", error)
      toast.error("Failed to update planning", {
        description: "An unexpected error occurred."
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (deleting) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/planning/${planningId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Planning deleted successfully")
        setHasUnsavedChanges(false) // Clear unsaved changes to avoid dialog
        router.push("/planning")
      } else {
        const data = await response.json()
        toast.error("Failed to delete planning", {
          description: data.error || "An error occurred while deleting."
        })
      }
    } catch (error) {
      console.error("Error deleting planning:", error)
      toast.error("Failed to delete planning", {
        description: "An unexpected error occurred."
      })
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader 
        title="Edit Planning" 
        showBackButton={true} 
        onBackClick={() => interceptNavigation("/planning")}
      />
        <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
          <div className="container mx-auto max-w-5xl space-y-6">
            <div className="flex justify-between items-center">
              <div className="h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-10 w-32 animate-pulse rounded bg-muted" />
                <div className="h-10 w-32 animate-pulse rounded bg-muted" />
              </div>
            </div>
            {[1, 2].map((section) => (
              <div key={section} className="rounded-lg border bg-card p-6 space-y-4">
                <div className="h-6 w-40 animate-pulse rounded bg-muted" />
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map((field) => (
                    <div key={field} className="space-y-2">
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                      <div className="h-10 w-full animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const totals = calculateTotals()

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader 
        title="Edit Planning" 
        showBackButton={true} 
        onBackClick={() => interceptNavigation("/planning")}
      />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-5xl space-y-6">
          <Breadcrumb items={[
            { label: "Planning", href: "/planning" },
            { label: planningNumber || "Edit" }
          ]} />
          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* Project Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Project Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2" ref={projectNameRef}>
                    <Label htmlFor="projectName">
                      Project Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="projectName"
                      value={projectName}
                      onChange={(e) => {
                        setProjectName(e.target.value)
                        if (errors.projectName) validateField("projectName", e.target.value)
                      }}
                      onBlur={(e) => validateField("projectName", e.target.value)}
                      placeholder="Enter project name"
                      error={!!errors.projectName}
                    />
                    {errors.projectName && (
                      <p className="text-sm text-destructive">{errors.projectName}</p>
                    )}
                  </div>
                  <div className="space-y-2" ref={clientNameRef}>
                    <Label htmlFor="clientName">
                      Client Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => {
                        setClientName(e.target.value)
                        if (errors.clientName) validateField("clientName", e.target.value)
                      }}
                      onBlur={(e) => validateField("clientName", e.target.value)}
                      placeholder="Enter client name"
                      error={!!errors.clientName}
                    />
                    {errors.clientName && (
                      <p className="text-sm text-destructive">{errors.clientName}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientBudget">
                    Client Budget <span className="text-destructive">*</span>
                  </Label>
                  <CurrencyInput
                    id="clientBudget"
                    value={clientBudget}
                    onValueChange={(value) => {
                      setClientBudget(value)
                    }}
                    placeholder="Enter client budget"
                  />
                  {errors.clientBudget && (
                    <p className="text-sm text-destructive">{errors.clientBudget}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value)
                    }}
                    placeholder="Enter additional notes"
                    rows={3}
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Items</h3>
                  <Button type="button" onClick={addItem} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-md bg-muted p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No items added yet. Click "Add Item" to start.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Header Row */}
                    <div className="grid gap-2 px-4 py-3 mb-1 bg-muted rounded-md lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                      <div className="text-sm font-bold">Product Name</div>
                      <div className="text-sm font-bold">Budget</div>
                      <div className="text-sm font-bold">Expense</div>
                      <div className="text-sm font-bold">Profit</div>
                      <div className="w-9"></div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                      {items.map((item, index) => {
                        const profit = calculateItemProfit(item.budget, item.expense)
                        return (
                          <Card key={item.id} className="bg-muted/50">
                            <CardContent className="py-2">
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                                <div>
                                  <Input
                                    value={item.productName}
                                    onChange={(e) =>
                                      updateItem(item.id, "productName", e.target.value)
                                    }
                                    placeholder="Type or select product"
                                    list={`products-${item.id}`}
                                  />
                                  <datalist id={`products-${item.id}`}>
                                    {products.map((product) => (
                                      <option key={product} value={product} />
                                    ))}
                                  </datalist>
                                </div>
                                <div>
                                  <CurrencyInput
                                    value={item.budget}
                                    onValueChange={(value) =>
                                      updateItem(item.id, "budget", value)
                                    }
                                    placeholder="Rp 0"
                                  />
                                </div>
                                <div>
                                  <CurrencyInput
                                    value={item.expense}
                                    onValueChange={(value) =>
                                      updateItem(item.id, "expense", value)
                                    }
                                    placeholder="Rp 0"
                                  />
                                </div>
                                <div>
                                  <div
                                    className={`flex h-11 items-center rounded-md border px-3 text-sm font-medium ${
                                      profit >= 0 ? "text-green-600" : "text-red-600"
                                    }`}
                                  >
                                    {formatCurrency(profit)}
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(item.id)}
                                    className="h-9 w-9 p-0"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Summary */}
              {items.length > 0 && (
                <div className="space-y-4 rounded-lg border bg-card p-4">
                  <h3 className="text-lg font-semibold">Summary</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Budget</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(totals.totalBudget)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Expense</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(totals.totalExpense)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Profit</p>
                      <p
                        className={`text-lg font-bold ${
                          totals.totalProfit >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(totals.totalProfit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Margin</p>
                      <p
                        className={`text-lg font-bold ${
                          totals.margin >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {totals.margin.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Delete Button - Left side */}
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={deleting || saving}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>

                {/* Save Buttons - Right side */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSubmit("draft")}
                    disabled={saving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowFinalizeDialog(true)}
                    disabled={saving}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Finalize Planning
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      {/* Finalize Confirmation Dialog */}
      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Planning?</AlertDialogTitle>
            <AlertDialogDescription>
              Once finalized, this planning <strong>cannot be edited anymore</strong>. 
              A quotation will be generated from this planning. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowFinalizeDialog(false)
                handleSubmit("final")
              }}
              disabled={saving}
            >
              Yes, Finalize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onSave={handleSaveAndLeave}
        onLeave={handleLeaveWithoutSaving}
        isSaving={isSavingDraft}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Planning?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the planning{" "}
              <strong>{planningNumber}</strong> and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

