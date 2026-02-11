/**
 * Request Deduplication
 * 
 * Prevents duplicate in-flight requests to the same endpoint
 * Improves performance by avoiding redundant API calls
 * 
 * Example: Multiple components requesting /api/companies at the same time
 * will share a single request instead of making multiple identical requests
 */

interface PendingRequest<T> {
  promise: Promise<T>
  timestamp: number
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>()
  private readonly CACHE_DURATION = 100 // 100ms cache for deduplication
  
  /**
   * Deduplicate a fetch request
   * If the same URL is already being fetched, return the existing promise
   */
  async fetch<T = any>(url: string, options?: RequestInit): Promise<T> {
    const cacheKey = this.getCacheKey(url, options)
    
    // Check if request is already in flight
    const pending = this.pendingRequests.get(cacheKey)
    if (pending) {
      // If request is still fresh (< 100ms old), reuse it
      if (Date.now() - pending.timestamp < this.CACHE_DURATION) {
        console.log(`🔄 Deduplicating request to ${url}`)
        return pending.promise
      } else {
        // Old request, remove it
        this.pendingRequests.delete(cacheKey)
      }
    }
    
    // Make new request
    const promise = fetch(url, options).then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      return res.json()
    }).finally(() => {
      // Clean up after request completes
      this.pendingRequests.delete(cacheKey)
    })
    
    // Store pending request
    this.pendingRequests.set(cacheKey, {
      promise,
      timestamp: Date.now()
    })
    
    return promise
  }
  
  /**
   * Generate cache key from URL and options
   */
  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET'
    const body = options?.body ? JSON.stringify(options.body) : ''
    return `${method}:${url}:${body}`
  }
  
  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear()
  }
  
  /**
   * Get number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size
  }
  
  /**
   * Get all pending request URLs
   */
  getPendingUrls(): string[] {
    return Array.from(this.pendingRequests.keys())
  }
}

// Export singleton instance
export const deduplicator = new RequestDeduplicator()

/**
 * Deduplicated fetch function
 * Use this instead of native fetch() to automatically deduplicate requests
 */
export async function deduplicatedFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  return deduplicator.fetch<T>(url, options)
}

/**
 * Hook for deduplicated API calls in React components
 */
export function useDeduplicatedFetch() {
  return {
    fetch: deduplicatedFetch,
    pendingCount: deduplicator.getPendingCount(),
  }
}

/**
 * Request batching utility
 * Collects multiple requests and sends them in a single batch
 */
class RequestBatcher {
  private batchQueue: Array<{
    url: string
    resolve: (value: any) => void
    reject: (error: any) => void
  }> = []
  private timer: NodeJS.Timeout | null = null
  private readonly BATCH_DELAY = 50 // Wait 50ms to collect requests
  private readonly MAX_BATCH_SIZE = 20
  
  /**
   * Add request to batch queue
   */
  async enqueue<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ url, resolve, reject })
      
      // Start batch timer if not already running
      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.BATCH_DELAY)
      }
      
      // Auto-flush if batch is full
      if (this.batchQueue.length >= this.MAX_BATCH_SIZE) {
        this.flush()
      }
    })
  }
  
  /**
   * Flush batch - send all queued requests
   */
  private async flush() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    
    if (this.batchQueue.length === 0) return
    
    const batch = [...this.batchQueue]
    this.batchQueue = []
    
    try {
      // Group by resource type
      const invoices: string[] = []
      const quotations: string[] = []
      const expenses: string[] = []
      
      batch.forEach(({ url }) => {
        if (url.includes('/api/invoice/')) {
          const id = url.split('/').pop()
          if (id) invoices.push(id)
        } else if (url.includes('/api/quotation/')) {
          const id = url.split('/').pop()
          if (id) quotations.push(id)
        } else if (url.includes('/api/expense/')) {
          const id = url.split('/').pop()
          if (id) expenses.push(id)
        }
      })
      
      // Build batch API URL
      const params = new URLSearchParams()
      if (invoices.length > 0) params.append('invoices', invoices.join(','))
      if (quotations.length > 0) params.append('quotations', quotations.join(','))
      if (expenses.length > 0) params.append('expenses', expenses.join(','))
      
      // Send batch request
      const response = await fetch(`/api/batch?${params.toString()}`)
      const data = await response.json()
      
      // Resolve individual promises with their data
      batch.forEach(({ url, resolve, reject }) => {
        try {
          let result = null
          
          if (url.includes('/api/invoice/')) {
            const id = url.split('/').pop()
            result = data.invoices.find((inv: any) => inv.id === id)
          } else if (url.includes('/api/quotation/')) {
            const id = url.split('/').pop()
            result = data.quotations.find((q: any) => q.id === id)
          } else if (url.includes('/api/expense/')) {
            const id = url.split('/').pop()
            result = data.expenses.find((exp: any) => exp.id === id)
          }
          
          if (result) {
            resolve(result)
          } else {
            reject(new Error('Resource not found in batch response'))
          }
        } catch (error) {
          reject(error)
        }
      })
    } catch (error) {
      // Reject all promises if batch fails
      batch.forEach(({ reject }) => reject(error))
    }
  }
}

export const batcher = new RequestBatcher()

/**
 * Batched fetch - automatically batches multiple requests
 */
export async function batchedFetch<T = any>(url: string): Promise<T> {
  // Only batch GET requests to specific endpoints
  if (url.match(/\/api\/(invoice|quotation|expense)\/[a-zA-Z0-9]+$/)) {
    return batcher.enqueue<T>(url)
  }
  
  // Fall back to regular fetch for other endpoints
  return deduplicatedFetch<T>(url)
}
