import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'

/**
 * CRITICAL TEST 3: Batch Operations Performance
 * 
 * Purpose: Ensure updates are fast and efficient
 * Verifies parallel operations vs sequential
 */
describe('🟡 CRITICAL: Performance & Batch Operations', () => {
  let testQuotationId: string

  beforeAll(async () => {
    // Create quotation with many items
    const quotation = await prisma.quotation.create({
      data: {
        quotationId: `TEST-PERF-${Date.now()}`,
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
        items: {
          create: Array.from({ length: 20 }, (_, i) => ({
            productName: `Item ${i + 1}`,
            total: 500000,
            order: i,
            details: {
              create: [
                { detail: `Detail ${i + 1}`, unitPrice: 100000, qty: 5, amount: 500000 }
              ]
            }
          }))
        }
      }
    })
    testQuotationId = quotation.id
  })

  afterAll(async () => {
    await prisma.quotation.delete({ where: { id: testQuotationId } })
  })

  it('should complete large update in under 2 seconds', async () => {
    const startTime = Date.now()

    await prisma.$transaction(async (tx) => {
      // Get existing items
      const existing = await tx.quotationItem.findMany({
        where: { quotationId: testQuotationId },
        select: { id: true }
      })

      // Update all items in parallel
      await Promise.all(
        existing.map(item =>
          tx.quotationItem.update({
            where: { id: item.id },
            data: { total: 550000 } // Small change
          })
        )
      )
    })

    const duration = Date.now() - startTime
    
    console.log(`✓ Updated 20 items in ${duration}ms`)
    expect(duration).toBeLessThan(2000) // Should be under 2 seconds
  })

  it('should use createMany for bulk inserts', async () => {
    const startTime = Date.now()

    // Create 10 new items using createMany
    await prisma.quotationItem.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        quotationId: testQuotationId,
        productName: `Bulk Item ${i + 1}`,
        total: 100000,
        order: 100 + i
      }))
    })

    const duration = Date.now() - startTime
    
    console.log(`✓ Bulk created 10 items in ${duration}ms`)
    expect(duration).toBeLessThan(1000) // Should be under 1 second

    // Verify they were created
    const items = await prisma.quotationItem.findMany({
      where: {
        quotationId: testQuotationId,
        productName: { startsWith: 'Bulk Item' }
      }
    })
    expect(items.length).toBe(10)
  })

  it('should handle deleteMany efficiently', async () => {
    const startTime = Date.now()

    // Delete all bulk items at once
    await prisma.quotationItem.deleteMany({
      where: {
        quotationId: testQuotationId,
        productName: { startsWith: 'Bulk Item' }
      }
    })

    const duration = Date.now() - startTime
    
    console.log(`✓ Bulk deleted 10 items in ${duration}ms`)
    expect(duration).toBeLessThan(500) // Should be very fast

    // Verify deletion
    const remaining = await prisma.quotationItem.findMany({
      where: {
        quotationId: testQuotationId,
        productName: { startsWith: 'Bulk Item' }
      }
    })
    expect(remaining.length).toBe(0)
  })
})
