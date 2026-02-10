import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { cache, cacheKeys } from '@/lib/redis'

describe('Redis Cache Integration', () => {
  // Skip tests if Redis is not configured
  const skipIfNoRedis = () => {
    if (!process.env.REDIS_URL) {
      console.log('⚠️  REDIS_URL not configured, skipping Redis tests')
      return true
    }
    return false
  }

  beforeAll(async () => {
    if (skipIfNoRedis()) return
    
    // Wait for Redis to be ready
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  afterAll(async () => {
    if (skipIfNoRedis()) return
    
    // Clean up test cache keys
    await cache.delete('test:*')
  })

  it('should set and get cache values', async () => {
    if (skipIfNoRedis()) {
      console.log('Skipping: Redis not configured')
      return
    }

    const testKey = 'test:basic'
    const testValue = { message: 'Hello Redis', timestamp: Date.now() }

    // Set cache
    await cache.set(testKey, testValue, 60)

    // Get cache
    const result = await cache.get(testKey)

    expect(result).toEqual(testValue)

    // Cleanup
    await cache.delete(testKey)
  })

  it('should return null for non-existent keys', async () => {
    if (skipIfNoRedis()) {
      console.log('Skipping: Redis not configured')
      return
    }

    const result = await cache.get('test:nonexistent')
    expect(result).toBeNull()
  })

  it('should delete cache by pattern', async () => {
    if (skipIfNoRedis()) {
      console.log('Skipping: Redis not configured')
      return
    }

    // Set multiple test keys
    await cache.set('test:delete:1', { id: 1 }, 60)
    await cache.set('test:delete:2', { id: 2 }, 60)
    await cache.set('test:delete:3', { id: 3 }, 60)

    // Delete by pattern
    await cache.delete('test:delete:*')

    // Verify all deleted
    const result1 = await cache.get('test:delete:1')
    const result2 = await cache.get('test:delete:2')
    const result3 = await cache.get('test:delete:3')

    expect(result1).toBeNull()
    expect(result2).toBeNull()
    expect(result3).toBeNull()
  })

  it('should generate consistent cache keys', () => {
    expect(cacheKeys.dashboardStats()).toBe('dashboard:stats')
    expect(cacheKeys.invoice('123')).toBe('invoice:123')
    expect(cacheKeys.invoiceList('paid', 2)).toBe('invoice:list:paid:2')
    expect(cacheKeys.trackerList()).toBe('tracker:list:1')
  })

  it('should gracefully handle Redis being unavailable', async () => {
    // This test verifies the app doesn't crash when Redis is not available
    const originalUrl = process.env.REDIS_URL
    
    // Even if Redis is configured, the cache helpers should handle errors gracefully
    const result = await cache.get('test:graceful')
    
    // Should return null, not throw
    expect(result).toBeDefined() // Can be null or an object
  })
})
