/**
 * Prefetching Utilities
 * 
 * Improves perceived performance by preloading data before user navigates
 * Use on hover/focus to warm up cache before click
 */

import { prefetch as swrPrefetch } from "@/hooks/use-fetch"

/**
 * Prefetch invoice data on hover
 */
export function prefetchInvoice(id: string) {
  return swrPrefetch(`/api/invoice/${id}`)
}

/**
 * Prefetch quotation data on hover
 */
export function prefetchQuotation(id: string) {
  return swrPrefetch(`/api/quotation/${id}`)
}

/**
 * Prefetch expense data on hover
 */
export function prefetchExpense(id: string) {
  return swrPrefetch(`/api/expense/${id}`)
}

/**
 * Prefetch planning data on hover
 */
export function prefetchPlanning(id: string) {
  return swrPrefetch(`/api/planning/${id}`)
}

/**
 * Prefetch production tracker data on hover
 */
export function prefetchTracker(id: string) {
  return swrPrefetch(`/api/production-tracker/${id}`)
}

/**
 * Prefetch list data (for pagination)
 */
export function prefetchInvoiceList(status?: string, page?: number) {
  const params = new URLSearchParams()
  if (status && status !== 'all') params.append('status', status)
  if (page) params.append('page', page.toString())
  return swrPrefetch(`/api/invoice?${params.toString()}`)
}

export function prefetchQuotationList(status?: string, page?: number) {
  const params = new URLSearchParams()
  if (status && status !== 'all') params.append('status', status)
  if (page) params.append('page', page.toString())
  return swrPrefetch(`/api/quotation?${params.toString()}`)
}

export function prefetchExpenseList(page?: number) {
  const params = new URLSearchParams()
  if (page) params.append('page', page.toString())
  return swrPrefetch(`/api/expense?${params.toString()}`)
}

/**
 * Prefetch dashboard stats for a specific year
 */
export function prefetchDashboardStats(year?: number) {
  const params = new URLSearchParams()
  if (year) params.append('year', year.toString())
  return swrPrefetch(`/api/dashboard-stats?${params.toString()}`)
}

/**
 * Generic prefetch utility
 */
export function prefetchUrl(url: string) {
  return swrPrefetch(url)
}

/**
 * Batch prefetch multiple URLs
 */
export async function batchPrefetch(urls: string[]) {
  return Promise.all(urls.map(url => swrPrefetch(url)))
}
