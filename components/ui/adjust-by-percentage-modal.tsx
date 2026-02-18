"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface AdjustByPercentageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (percentage: number, notes?: string) => void
  /** Pre-fill percentage when reopening (e.g. last applied 10 so user can change to 15). */
  initialPercentage?: number | null
  /** Pre-fill notes when reopening. */
  initialNotes?: string
  title?: string
  description?: string
}

/**
 * Modal to input a percentage (e.g. 30 for +30%) and optional notes, then confirm.
 * Used to adjust all product item amounts by that percentage across quotation, invoice, Paragon, Erha.
 * Notes are shown in the summary before total (e.g. "Price adjusted by 10% because early payment discount").
 */
export function AdjustByPercentageModal({
  open,
  onOpenChange,
  onConfirm,
  initialPercentage,
  initialNotes,
  title = "Adjust all amounts by percentage",
  description = "Enter a percentage to increase or decrease every line item. Example: 30 = +30%, -10 = -10%. Optional note will appear in the summary before total.",
}: AdjustByPercentageModalProps) {
  const [value, setValue] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setValue(initialPercentage != null ? String(initialPercentage) : "")
      setNotes(initialNotes ?? "")
      setError(null)
    }
  }, [open, initialPercentage, initialNotes])

  const handleConfirm = () => {
    const trimmed = value.trim()
    if (trimmed === "") {
      setError("Please enter a percentage.")
      return
    }
    const num = parseFloat(trimmed)
    if (Number.isNaN(num)) {
      setError("Please enter a valid number.")
      return
    }
    setError(null)
    onConfirm(num, notes.trim() || undefined)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="adjust-percentage">Percentage (%)</Label>
            <Input
              id="adjust-percentage"
              type="number"
              step="any"
              placeholder="e.g. 30, -10, or 0 to cancel"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adjust-notes">Note (optional)</Label>
            <Textarea
              id="adjust-notes"
              placeholder="e.g. Early payment discount"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Shown in summary before total as &quot;Price adjusted by X% because (note)&quot;. If left empty, only the percentage is shown.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
