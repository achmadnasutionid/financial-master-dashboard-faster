"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AutoExpandInput } from "@/components/ui/auto-expand-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Save, Plus, Trash2, Package } from "lucide-react"
import { toast } from "sonner"
import { PPH_OPTIONS } from "@/lib/constants"

interface ItemDetail {
  id: string
  detail: string
  unitPrice: string
  qty: string
  amount: number
}

interface Item {
  id: string
  productName: string
  details: ItemDetail[]
  total: number
}

interface Remark {
  id: string
  text: string
}

interface Product {
  id: string
  name: string
}

export default function EditTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const templateId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [pph, setPph] = useState("2")
  const [items, setItems] = useState<Item[]>([])
  const [remarks, setRemarks] = useState<Remark[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchTemplate()
  }, [templateId])

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products")
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/quotation-templates/${templateId}`)
      if (!response.ok) throw new Error("Template not found")
      
      const data = await response.json()
      
      setName(data.name)
      setDescription(data.description || "")
      setPph(data.pph)
      
      // Convert template items to form items
      const formItems = data.items.map((item: any) => ({
        id: item.id,
        productName: item.productName,
        details: item.details.map((detail: any) => ({
          id: detail.id,
          detail: detail.detail,
          unitPrice: detail.unitPrice.toString(),
          qty: detail.qty.toString(),
          amount: detail.unitPrice * detail.qty
        })),
        total: item.details.reduce((sum: number, d: any) => sum + (d.unitPrice * d.qty), 0)
      }))
      
      setItems(formItems)
      setRemarks(data.remarks || [])
    } catch (error) {
      console.error("Error fetching template:", error)
      toast.error("Failed to load template")
      router.push("/templates")
    } finally {
      setLoading(false)
    }
  }

  // Items management (same as create page)
  const addItem = () => {
    const newItemId = Date.now().toString()
    setItems([...items, {
      id: newItemId,
      productName: "",
      details: [{
        id: `${newItemId}-detail-${Date.now()}`,
        detail: "",
        unitPrice: "0",
        qty: "1",
        amount: 0
      }],
      total: 0
    }])
  }

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId))
  }

  const updateItemName = (itemId: string, productName: string) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, productName } : item
    ))
  }

  const addDetail = (itemId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          details: [
            ...item.details,
            {
              id: `${itemId}-detail-${Date.now()}`,
              detail: "",
              unitPrice: "0",
              qty: "1",
              amount: 0
            }
          ]
        }
      }
      return item
    }))
  }

  const removeDetail = (itemId: string, detailId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const newDetails = item.details.filter(d => d.id !== detailId)
        const newTotal = newDetails.reduce((sum, d) => sum + d.amount, 0)
        return { ...item, details: newDetails, total: newTotal }
      }
      return item
    }))
  }

  const updateDetail = (itemId: string, detailId: string, field: string, value: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const newDetails = item.details.map(detail => {
          if (detail.id === detailId) {
            const updated = { ...detail, [field]: value }
            const unitPrice = parseFloat(updated.unitPrice) || 0
            const qty = parseFloat(updated.qty) || 0
            updated.amount = unitPrice * qty
            return updated
          }
          return detail
        })
        const newTotal = newDetails.reduce((sum, d) => sum + d.amount, 0)
        return { ...item, details: newDetails, total: newTotal }
      }
      return item
    }))
  }

  // Remarks management
  const addRemark = () => {
    setRemarks([...remarks, {
      id: Date.now().toString(),
      text: ""
    }])
  }

  const updateRemark = (id: string, text: string) => {
    setRemarks(remarks.map(r => r.id === id ? { ...r, text } : r))
  }

  const removeRemark = (id: string) => {
    setRemarks(remarks.filter(r => r.id !== id))
  }

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Please enter a template name")
      return
    }

    if (items.length === 0) {
      toast.error("Please add at least one product item")
      return
    }

    const hasEmptyItems = items.some(item => !item.productName.trim())
    if (hasEmptyItems) {
      toast.error("Please fill in all product names")
      return
    }

    const hasEmptyDetails = items.some(item =>
      item.details.some(detail => !detail.detail.trim())
    )
    if (hasEmptyDetails) {
      toast.error("Please fill in all item details")
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch(`/api/quotation-templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          pph,
          items: items.map(item => ({
            productName: item.productName,
            details: item.details.map(detail => ({
              detail: detail.detail,
              unitPrice: detail.unitPrice,
              qty: detail.qty
            }))
          })),
          remarks: remarks.filter(r => r.text.trim()).map(r => ({
            text: r.text
          }))
        })
      })

      if (!response.ok) throw new Error("Failed to update template")

      toast.success("Template updated successfully")
      router.push("/templates")
    } catch (error) {
      console.error("Error updating template:", error)
      toast.error("Failed to update template")
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-8">
          <div className="container mx-auto max-w-5xl space-y-8">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-8">
        <div className="container mx-auto max-w-5xl space-y-8">
          <PageHeader
            title="Edit Quotation Template"
            description="Update your reusable quotation package"
            icon={Package}
          />

          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Basic Video Package"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Optional description for this template"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pph">Default PPh</Label>
                  <Select value={pph} onValueChange={setPph}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PPH_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Product Items */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg">Product Items *</Label>
                  {items.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {items.length} item{items.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No items added yet. Click "Add Product" to start.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {items.map((item) => (
                      <Card key={item.id} className="border-2">
                        <CardContent className="pt-6 space-y-4">
                          {/* Product Name */}
                          <div className="flex items-start gap-2">
                            <div className="flex-1 space-y-2">
                              <Label>Product Name</Label>
                              <AutoExpandInput
                                value={item.productName}
                                onChange={(value) => updateItemName(item.id, value)}
                                options={products.map(p => p.name)}
                                placeholder="Type or select a product"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-7"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Details */}
                          <div className="space-y-3">
                            <Label>Details</Label>
                            {item.details.map((detail) => (
                              <div key={detail.id} className="flex items-start gap-2">
                                <div className="flex-1 grid grid-cols-12 gap-2">
                                  <div className="col-span-6">
                                    <Input
                                      placeholder="Detail description"
                                      value={detail.detail}
                                      onChange={(e) => updateDetail(item.id, detail.id, 'detail', e.target.value)}
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <CurrencyInput
                                      placeholder="Price"
                                      value={detail.unitPrice}
                                      onChange={(value) => updateDetail(item.id, detail.id, 'unitPrice', value)}
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <Input
                                      type="number"
                                      placeholder="Qty"
                                      value={detail.qty}
                                      onChange={(e) => updateDetail(item.id, detail.id, 'qty', e.target.value)}
                                      min="0"
                                      step="1"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <Input
                                      value={new Intl.NumberFormat('id-ID').format(detail.amount)}
                                      disabled
                                      className="bg-muted"
                                    />
                                  </div>
                                </div>
                                {item.details.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeDetail(item.id, detail.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addDetail(item.id)}
                            >
                              <Plus className="mr-2 h-3 w-3" />
                              Add Detail
                            </Button>
                          </div>

                          {/* Item Total */}
                          <div className="flex justify-end pt-2 border-t">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Item Total</p>
                              <p className="text-lg font-semibold">
                                {new Intl.NumberFormat('id-ID', {
                                  style: 'currency',
                                  currency: 'IDR',
                                  minimumFractionDigits: 0
                                }).format(item.total)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="button" onClick={addItem} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Remarks */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Label className="text-lg">Remarks (Optional)</Label>
                
                {remarks.map((remark) => (
                  <div key={remark.id} className="flex items-start gap-2">
                    <Textarea
                      value={remark.text}
                      onChange={(e) => updateRemark(remark.id, e.target.value)}
                      placeholder="Add a remark"
                      rows={1}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRemark(remark.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button type="button" onClick={addRemark} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Remark
                </Button>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/templates")}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
