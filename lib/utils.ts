import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Memoized currency formatter for Indonesian Rupiah
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

// Memoized date formatter
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

export function formatDate(date: string | Date): string {
  return dateFormatter.format(new Date(date))
}

// Short date formatter
const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export function formatShortDate(date: string | Date): string {
  return shortDateFormatter.format(new Date(date))
}

/**
 * Normalizes a product name by removing extra spaces
 * - Trims leading/trailing spaces
 * - Replaces multiple consecutive spaces with single space
 */
export function normalizeProductName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/**
 * Checks if a product name matches any product in the master data
 * Uses normalized comparison (removes extra spaces before comparing)
 */
export function isProductFromMaster(productName: string, masterProducts: Array<{ name: string }> | string[]): boolean {
  const normalizedInput = normalizeProductName(productName)
  
  // Handle both array of objects with 'name' property and array of strings
  if (masterProducts.length === 0) return false
  
  if (typeof masterProducts[0] === 'string') {
    return (masterProducts as string[]).some(p => normalizeProductName(p) === normalizedInput)
  } else {
    return (masterProducts as Array<{ name: string }>).some(p => normalizeProductName(p.name) === normalizedInput)
  }
}

/**
 * Formats a product name based on whether it's from master data
 * - If from master data: returns the normalized name as-is
 * - If custom: returns normalized and uppercased name
 */
export function formatProductName(productName: string, masterProducts: Array<{ name: string }> | string[]): string {
  const normalized = normalizeProductName(productName)
  const isFromMaster = isProductFromMaster(productName, masterProducts)
  return isFromMaster ? normalized : normalized.toUpperCase()
}

