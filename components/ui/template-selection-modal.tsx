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

interface TemplateRemark {
  id: string
  text: string
}

interface QuotationTemplate {
  id: string
  name: string
  description: string | null
  pph: string
  items: TemplateItem[]
  remarks: TemplateRemark[]
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Starting Point</DialogTitle>
          <DialogDescription>
            Choose a template to start with, or create a blank quotation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Blank Quotation Card */}
                <Card
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary border-2"
                  onClick={handleSelectBlank}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Blank Quotation</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Start from scratch
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Create a custom quotation with complete flexibility
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
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-100">
                              <Package className="h-6 w-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="truncate">{template.name}</CardTitle>
                              {template.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {template.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Items:</span>
                            <span className="font-medium">{template.items.length}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Est. Value:</span>
                            <span className="font-medium">{formatCurrency(estimatedTotal)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">PPh:</span>
                            <span className="font-medium">{template.pph}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Manage Templates Link */}
              <div className="flex justify-center pt-4 border-t">
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
