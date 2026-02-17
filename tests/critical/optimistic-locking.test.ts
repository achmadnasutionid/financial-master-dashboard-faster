import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { verifyRecordVersion, isRecordStale, OptimisticLockError } from '@/lib/optimistic-locking'

/**
 * CRITICAL TEST 2: Optimistic Locking
 * 
 * Purpose: Ensure concurrent edits are detected and prevented
 * Prevents users from overwriting each other's changes
 */
describe('🔴 CRITICAL: Optimistic Locking & Concurrent Edits', () => {
  let testQuotationId: string

  beforeAll(async () => {
    const quotation = await prisma.quotation.create({
      data: {
        quotationId: `TEST-LOCK-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test Address',
        companyCity: 'Test City',
        companyProvince: 'Test Province',
        productionDate: new Date(),
        billTo: 'Test Client',
        billingName: 'Test Billing',
        billingBankName: 'Test Bank',
        billingBankAccount: '123456',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'data:image/png;base64,test',
        pph: '2',
        totalAmount: 10000000,
      }
    })
    testQuotationId = quotation.id
  })

  afterAll(async () => {
    // Cleanup trackers first (auto-created via syncTracker)
    await prisma.productionTracker.deleteMany({
      where: {
        projectName: 'Test Client',
        deletedAt: null
      }
    })
    
    // Then cleanup quotation
    await prisma.quotation.delete({ where: { id: testQuotationId } })
  })

  it('should detect stale record (record was modified)', () => {
    const oldTimestamp = new Date('2024-01-01T10:00:00Z')
    const newTimestamp = new Date('2024-01-01T10:01:00Z')

    const isStale = isRecordStale(oldTimestamp, newTimestamp)
    expect(isStale).toBe(true)
  })

  it('should not detect stale record (timestamps match)', () => {
    const timestamp = new Date('2024-01-01T10:00:00Z')

    const isStale = isRecordStale(timestamp, timestamp)
    expect(isStale).toBe(false)
  })

  it('should throw OptimisticLockError when version mismatch', async () => {
    // Get current version
    const current = await prisma.quotation.findUnique({
      where: { id: testQuotationId },
      select: { updatedAt: true }
    })

    // Simulate User A's version (older)
    const userAVersion = new Date(current!.updatedAt.getTime() - 1000) // 1 second older

    // User B updates the record (changes updatedAt)
    await prisma.quotation.update({
      where: { id: testQuotationId },
      data: { companyName: 'User B Update' }
    })

    // Get the new version after User B's update
    const afterUpdate = await prisma.quotation.findUnique({
      where: { id: testQuotationId },
      select: { updatedAt: true }
    })

    // User A tries to save with old version - should throw error
    expect(() => {
      verifyRecordVersion(userAVersion, afterUpdate)
    }).toThrow(OptimisticLockError)
  })

  it('should allow save when version matches', async () => {
    // Get current version
    const current = await prisma.quotation.findUnique({
      where: { id: testQuotationId },
      select: { updatedAt: true }
    })

    // User has correct version - should not throw
    expect(() => {
      verifyRecordVersion(current!.updatedAt, current)
    }).not.toThrow()
  })

  it('should simulate real concurrent edit scenario', async () => {
    // User A loads the record
    const userAVersion = await prisma.quotation.findUnique({
      where: { id: testQuotationId },
      select: { id: true, companyName: true, updatedAt: true }
    })

    // User B loads the record (same version)
    const userBVersion = await prisma.quotation.findUnique({
      where: { id: testQuotationId },
      select: { id: true, companyName: true, updatedAt: true }
    })

    // User A saves their changes
    await prisma.quotation.update({
      where: { id: testQuotationId },
      data: { companyName: 'User A Changes' }
    })

    // Get latest version after User A's save
    const latestAfterA = await prisma.quotation.findUnique({
      where: { id: testQuotationId },
      select: { updatedAt: true }
    })

    // User B tries to save with their old version
    // This should fail because User A already updated
    expect(() => {
      verifyRecordVersion(userBVersion!.updatedAt, latestAfterA)
    }).toThrow(OptimisticLockError)

    // User B should get the error message
    try {
      verifyRecordVersion(userBVersion!.updatedAt, latestAfterA)
    } catch (error) {
      expect(error).toBeInstanceOf(OptimisticLockError)
      expect((error as Error).message).toContain('modified by another user')
    }
  })
})
