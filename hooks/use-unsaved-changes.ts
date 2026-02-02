"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean
  onSave: () => Promise<void> | void
  enabled?: boolean
}

export function useUnsavedChanges({
  hasUnsavedChanges,
  onSave,
  enabled = true
}: UseUnsavedChangesOptions) {
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const pendingNavigationRef = useRef<string | null>(null)

  // Handle browser back/forward/close
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = "" // Chrome requires returnValue to be set
      return ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges, enabled])

  const interceptNavigation = (url: string) => {
    if (!enabled || !hasUnsavedChanges) {
      router.push(url)
      return
    }

    pendingNavigationRef.current = url
    setShowDialog(true)
  }

  const handleSaveAndLeave = async () => {
    setIsSaving(true)
    try {
      await onSave()
      // Navigation will happen after save completes (in the save function)
      setShowDialog(false)
    } catch (error) {
      console.error("Failed to save:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLeaveWithoutSaving = () => {
    if (pendingNavigationRef.current) {
      router.push(pendingNavigationRef.current)
      pendingNavigationRef.current = null
    }
    setShowDialog(false)
  }

  return {
    showDialog,
    setShowDialog,
    isSaving,
    interceptNavigation,
    handleSaveAndLeave,
    handleLeaveWithoutSaving
  }
}
