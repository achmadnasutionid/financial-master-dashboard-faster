"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Package, Settings } from "lucide-react"
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
  onSelect: (template: QuotationTemplate | null) => void
}

export function TemplateSelectionModal({ open, onClose, onSelect }: TemplateSelectionModalProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<QuotationTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) {
      fetchTemplates()
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

  const handleSelectTemplate = (template: QuotationTemplate) => {
    onSelect(template)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Starting Point</DialogTitle>
          <DialogDescription>
            Choose a template to start with, or create a blank quotation
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* Blank Quotation Card */}
                <Card
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary border-2"
                  onClick={handleSelectBlank}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-base">Blank Quotation</CardTitle>
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

                  return (
                    <Card
                      key={template.id}
                      className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-100">
                            <Package className="h-4 w-4" />
                          </div>
                          <CardTitle className="text-base truncate flex-1">{template.name}</CardTitle>
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
      </DialogContent>
    </Dialog>
  )
}
