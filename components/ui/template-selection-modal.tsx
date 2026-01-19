"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Package, Settings, Check, X } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface TemplateDetail {
  detail: string
  unitPrice: number
  qty: number
}

interface TemplateItem {
  id: string
  productName: string
  details: TemplateDetail[]
}

interface QuotationTemplate {
  id: string
  name: string
  description: string | null
  items: TemplateItem[]
}

interface TemplateSelectionModalProps {
  open: boolean
  onClose: () => void
  onSelect: (templates: QuotationTemplate[] | null) => void
}

export function TemplateSelectionModal({ open, onClose, onSelect }: TemplateSelectionModalProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<QuotationTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplates, setSelectedTemplates] = useState<QuotationTemplate[]>([])

  useEffect(() => {
    if (open) {
      fetchTemplates()
      setSelectedTemplates([]) // Reset selection when modal opens
    }
  }, [open])

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/quotation-templates")
      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      console.error("Error fetching templates:", error)
      toast.error("Failed to load templates")
    } finally {
      setLoading(false)
    }
  }

  const calculateEstimatedTotal = (items: TemplateItem[]) => {
    return items.reduce((total, item) => {
      const itemTotal = item.details.reduce((sum, detail) => {
        return sum + (detail.unitPrice * detail.qty)
      }, 0)
      return total + itemTotal
    }, 0)
  }

  const handleSelectBlank = () => {
    onSelect(null)
    onClose()
  }

  const handleToggleTemplate = (template: QuotationTemplate) => {
    setSelectedTemplates(prev => {
      const isSelected = prev.some(t => t.id === template.id)
      if (isSelected) {
        // Remove from selection
        return prev.filter(t => t.id !== template.id)
      } else {
        // Add to selection (maintains order of selection)
        return [...prev, template]
      }
    })
  }

  const handleConfirmSelection = () => {
    if (selectedTemplates.length === 0) {
      toast.warning("No templates selected", {
        description: "Please select at least one template or choose blank quotation."
      })
      return
    }
    
    onSelect(selectedTemplates)
    onClose()
  }

  const isTemplateSelected = (templateId: string) => {
    return selectedTemplates.some(t => t.id === templateId)
  }

  const getSelectionOrder = (templateId: string) => {
    const index = selectedTemplates.findIndex(t => t.id === templateId)
    return index >= 0 ? index + 1 : null
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Starting Point</DialogTitle>
          <DialogDescription>
            Choose one or more templates to start with, or create a blank quotation. Items will be added in the order you select.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-24" />
                  </CardHeader>
                  <CardContent className="pb-3">
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
                {/* Blank Quotation Card */}
                <Card
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary border-2 flex flex-col"
                  onClick={handleSelectBlank}
                >
                  <CardHeader className="pb-2 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-base break-words leading-tight">Blank Quotation</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-xs text-muted-foreground">
                      Start from scratch
                    </p>
                  </CardContent>
                </Card>

                {/* Template Cards */}
                {templates.map((template) => {
                  const estimatedTotal = calculateEstimatedTotal(template.items)
                  const isSelected = isTemplateSelected(template.id)
                  const selectionOrder = getSelectionOrder(template.id)

                  return (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-lg relative flex flex-col ${
                        isSelected 
                          ? "border-2 border-primary bg-primary/5" 
                          : "hover:border-primary"
                      }`}
                      onClick={() => handleToggleTemplate(template)}
                    >
                      {/* Selection Badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                          {selectionOrder}
                        </div>
                      )}
                      
                      <CardHeader className="pb-2 flex-1">
                        <div className="flex items-start gap-2">
                          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md ${
                            isSelected 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-100"
                          }`}>
                            {isSelected ? <Check className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                          </div>
                          <CardTitle className="text-base break-words leading-tight pr-6">{template.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Items:</span>
                            <span className="font-medium">{template.items.length}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Est. Value:</span>
                            <span className="font-medium">{formatCurrency(estimatedTotal)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Manage Templates Link */}
              <div className="flex justify-center pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClose()
                    router.push("/templates")
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Templates
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Footer with confirm/cancel buttons */}
        {selectedTemplates.length > 0 && (
          <DialogFooter>
            <div className="flex w-full items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedTemplates.length} template{selectedTemplates.length > 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedTemplates([])}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear Selection
                </Button>
                <Button
                  onClick={handleConfirmSelection}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Confirm Selection
                </Button>
              </div>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
