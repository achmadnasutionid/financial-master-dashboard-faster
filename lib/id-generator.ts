import { prisma } from './prisma'

/**
 * Optimized ID Generator with In-Memory Cache
 * Reduces database queries by caching the last number per year
 */

interface IDCache {
  year: number
  lastNumber: number
  lastFetch: number
}

// In-memory cache for ID generation
const idCache = new Map<string, IDCache>()
const CACHE_TTL = 60000 // 1 minute cache TTL

// Lock mechanism to prevent race conditions
const generationLocks = new Map<string, Promise<string>>()

/**
 * Generate a unique ID with format PREFIX-YYYY-NNNN
 * Uses in-memory cache to minimize database queries
 * Thread-safe: prevents race conditions with lock mechanism
 */
export async function generateId(
  prefix: 'PLN' | 'QTN' | 'INV' | 'EXP' | 'PRG' | 'ERH',
  modelName: 'planning' | 'quotation' | 'invoice' | 'expense' | 'paragonTicket' | 'erhaTicket'
): Promise<string> {
  const year = new Date().getFullYear()
  const cacheKey = `${prefix}-${year}`

  // If there's already a generation in progress for this key, wait for it
  const existingLock = generationLocks.get(cacheKey)
  if (existingLock) {
    await existingLock
  }

  // Create a new lock for this generation
  const generationPromise = (async () => {
    const now = Date.now()

    // Check cache
    let cached = idCache.get(cacheKey)

    // Invalidate cache if year changed or TTL expired
    if (!cached || cached.year !== year || (now - cached.lastFetch) > CACHE_TTL) {
      // Fetch latest number from database
      const idField = `${modelName}Id` as const
      const searchPrefix = `${prefix}-${year}-`

      const lastRecord = await (prisma as any)[modelName].findFirst({
        where: {
          [idField]: {
            startsWith: searchPrefix
          }
        },
        orderBy: {
          [idField]: 'desc'
        },
        select: {
          [idField]: true
        }
      })

      let lastNumber = 0
      if (lastRecord) {
        const parts = lastRecord[idField].split('-')
        lastNumber = parseInt(parts[2]) || 0
      }

      cached = {
        year,
        lastNumber,
        lastFetch: now
      }
      idCache.set(cacheKey, cached)
    }

    // Increment and update cache atomically
    cached.lastNumber++
    cached.lastFetch = now
    idCache.set(cacheKey, cached)

    // Return formatted ID
    return `${prefix}-${year}-${cached.lastNumber.toString().padStart(4, '0')}`
  })()

  // Store the promise to prevent concurrent generations
  generationLocks.set(cacheKey, generationPromise)

  try {
    const result = await generationPromise
    return result
  } finally {
    // Clean up the lock after a short delay to allow any waiting requests to proceed
    setTimeout(() => generationLocks.delete(cacheKey), 100)
  }
}

/**
 * Clear cache for a specific prefix and year
 * Useful when you need to force a database refresh
 */
export function clearIdCache(prefix?: string, year?: number) {
  if (prefix && year) {
    idCache.delete(`${prefix}-${year}`)
  } else if (prefix) {
    // Clear all entries for this prefix
    for (const key of idCache.keys()) {
      if (key.startsWith(`${prefix}-`)) {
        idCache.delete(key)
      }
    }
  } else {
    // Clear entire cache
    idCache.clear()
  }
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getIdCacheStats() {
  return {
    size: idCache.size,
    entries: Array.from(idCache.entries()).map(([key, value]) => ({
      key,
      lastNumber: value.lastNumber,
      age: Date.now() - value.lastFetch
    }))
  }
}
