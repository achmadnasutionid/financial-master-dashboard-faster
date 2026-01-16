"use client"

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

interface UnsavedChangesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveAsDraft: () => void
  onLeave: () => void
  isSaving?: boolean
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onSaveAsDraft,
  onLeave,
  isSaving = false
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Do you want to save as draft before leaving?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onLeave} disabled={isSaving}>
            Leave Without Saving
          </AlertDialogCancel>
          <AlertDialogAction onClick={onSaveAsDraft} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save as Draft"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
