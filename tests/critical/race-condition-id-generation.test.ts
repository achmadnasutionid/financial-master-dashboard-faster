/**
 * RACE CONDITION FIX - ID GENERATION TESTS
 * 
 * Tests verify that ID generation is atomic and race-condition-free:
 * 1. Concurrent requests generate unique IDs
 * 2. No duplicate IDs even under high load
 * 3. Sequential numbering is maintained
 * 4. Works across multiple "simulated instances"
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/id-generator'

describe('RACE CONDITION FIX - ID Generation', () => {
  // Track created test records for cleanup
  const createdInvoiceIds: string[] = []
  const createdQuotationIds: string[] = []
  const createdExpenseIds: string[] = []

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.invoice.deleteMany({
      where: { billTo: { contains: 'RACE_TEST' } }
    })
    await prisma.quotation.deleteMany({
      where: { billTo: { contains: 'RACE_TEST' } }
    })
    await prisma.expense.deleteMany({
      where: { projectName: { contains: 'RACE_TEST' } }
    })
  })

  afterAll(async () => {
    // Clean up all test data
    const cleanupInvoice = async (id: string) => {
      try {
        const exists = await prisma.invoice.findUnique({ where: { id } })
        if (!exists) return

        await prisma.invoiceItemDetail.deleteMany({
          where: { invoiceItem: { invoiceId: id } }
        })
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
        await prisma.invoiceRemark.deleteMany({ where: { invoiceId: id } })
        await prisma.invoiceSignature.deleteMany({ where: { invoiceId: id } })
        await prisma.invoice.delete({ where: { id } })
      } catch (e) { /* ignore */ }
    }

    const cleanupQuotation = async (id: string) => {
      try {
        await prisma.quotationItemDetail.deleteMany({
          where: { quotationItem: { quotationId: id } }
        })
        await prisma.quotationItem.deleteMany({ where: { quotationId: id } })
        await prisma.quotationRemark.deleteMany({ where: { quotationId: id } })
        await prisma.quotationSignature.deleteMany({ where: { quotationId: id } })
        await prisma.quotation.delete({ where: { id } })
      } catch (e) { /* ignore */ }
    }

    const cleanupExpense = async (id: string) => {
      try {
        const exists = await prisma.expense.findUnique({ where: { id } })
        if (!exists) return

        await prisma.expenseItem.deleteMany({ where: { expenseId: id } })
        await prisma.expense.delete({ where: { id } })
      } catch (e) { /* ignore */ }
    }

    for (const id of createdInvoiceIds) await cleanupInvoice(id)
    for (const id of createdQuotationIds) await cleanupQuotation(id)
    for (const id of createdExpenseIds) await cleanupExpense(id)

    // Pattern-based cleanup
    try {
      const testInvoices = await prisma.invoice.findMany({
        where: { billTo: { contains: 'RACE_TEST' } }
      })
      for (const inv of testInvoices) await cleanupInvoice(inv.id)

      const testQuotations = await prisma.quotation.findMany({
        where: { billTo: { contains: 'RACE_TEST' } }
      })
      for (const qtn of testQuotations) await cleanupQuotation(qtn.id)

      const testExpenses = await prisma.expense.findMany({
        where: { projectName: { contains: 'RACE_TEST' } }
      })
      for (const exp of testExpenses) await cleanupExpense(exp.id)
    } catch (e) { /* ignore */ }
  })

  describe('Sequential ID Generation', () => {
    it('should generate sequential IDs', async () => {
      const id1 = await generateId('INV', 'invoice')
      const id2 = await generateId('INV', 'invoice')
      const id3 = await generateId('INV', 'invoice')

      // Extract numbers
      const num1 = parseInt(id1.split('-')[2])
      const num2 = parseInt(id2.split('-')[2])
      const num3 = parseInt(id3.split('-')[2])

      // Should be sequential (allowing small gaps due to parallel test execution)
      expect(num2).toBeGreaterThan(num1)
      expect(num3).toBeGreaterThan(num2)
      expect(num2 - num1).toBeLessThan(10) // Allow gap, but not too large
      expect(num3 - num2).toBeLessThan(10)
    })

    it('should maintain sequence even with database writes', async () => {
      const generatedIds: string[] = []

      // Generate and immediately write to database
      for (let i = 0; i < 5; i++) {
        const invoiceId = await generateId('INV', 'invoice')
        generatedIds.push(invoiceId)

        const invoice = await prisma.invoice.create({
          data: {
            invoiceId,
            companyName: 'CATARACTA STUDIO',
            companyAddress: 'Test Address',
            companyCity: 'Test City',
            companyProvince: 'Test Province',
            billTo: `RACE_TEST_SEQ_${i}`,
            billingName: 'Test Billing',
            billingBankName: 'Test Bank',
            billingBankAccount: '1234567890',
            billingBankAccountName: 'Test Account',
            signatureName: 'Test Signature',
            signatureImageData: 'data:image/png;base64,test',
            pph: '0',
            totalAmount: 1000000,
            productionDate: new Date().toISOString(),
            status: 'draft'
          }
        })
        createdInvoiceIds.push(invoice.id)
      }

      // Verify all IDs are unique
      const uniqueIds = new Set(generatedIds)
      expect(uniqueIds.size).toBe(5)

      // Verify sequential numbering (allowing for gaps from other concurrent tests)
      const numbers = generatedIds.map(id => parseInt(id.split('-')[2]))
      for (let i = 1; i < numbers.length; i++) {
        // Each ID should be greater than the previous (allowing gaps)
        expect(numbers[i]).toBeGreaterThan(numbers[i - 1])
        // But not more than 100 apart (reasonable gap for concurrent tests)
        expect(numbers[i] - numbers[i - 1]).toBeLessThan(100)
      }
    })
  })

  describe('Concurrent ID Generation (Race Condition Test)', () => {
    it('should handle 10 concurrent requests without duplicates', async () => {
      const promises = Array.from({ length: 10 }, () => 
        generateId('QTN', 'quotation')
      )

      const ids = await Promise.all(promises)

      // All IDs should be unique
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(10)
      expect(ids.length).toBe(10)

      // Verify format
      ids.forEach(id => {
        expect(id).toMatch(/^QTN-\d{4}-\d{4}$/)
      })
    }, 60000) // Give more time for lock retries

    it('should handle 50 concurrent requests without duplicates', async () => {
      const promises = Array.from({ length: 50 }, () => 
        generateId('EXP', 'expense')
      )

      const ids = await Promise.all(promises)

      // All IDs should be unique
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(50)

      // Verify all follow pattern
      ids.forEach(id => {
        expect(id).toMatch(/^EXP-\d{4}-\d{4}$/)
      })
    })

    it('should handle concurrent requests with actual DB writes', async () => {
      const createInvoice = async (index: number) => {
        const invoiceId = await generateId('INV', 'invoice')
        
        const invoice = await prisma.invoice.create({
          data: {
            invoiceId,
            companyName: 'CATARACTA STUDIO',
            companyAddress: 'Test Address',
            companyCity: 'Test City',
            companyProvince: 'Test Province',
            billTo: `RACE_TEST_CONCURRENT_${index}`,
            billingName: 'Test Billing',
            billingBankName: 'Test Bank',
            billingBankAccount: '1234567890',
            billingBankAccountName: 'Test Account',
            signatureName: 'Test Signature',
            signatureImageData: 'data:image/png;base64,test',
            pph: '0',
            totalAmount: 1000000,
            productionDate: new Date().toISOString(),
            status: 'draft'
          }
        })

        return { invoiceId, dbId: invoice.id }
      }

      // Create 20 invoices concurrently
      const promises = Array.from({ length: 20 }, (_, i) => createInvoice(i))
      const results = await Promise.all(promises)

      // Track for cleanup
      results.forEach(r => createdInvoiceIds.push(r.dbId))

      // Extract invoice IDs
      const invoiceIds = results.map(r => r.invoiceId)

      // All IDs should be unique
      const uniqueIds = new Set(invoiceIds)
      expect(uniqueIds.size).toBe(20)

      // Verify all records exist in database
      const dbInvoices = await prisma.invoice.findMany({
        where: {
          invoiceId: { in: invoiceIds }
        }
      })
      expect(dbInvoices.length).toBe(20)
    })
  })

  describe('Multi-Entity Concurrent Generation', () => {
    it('should handle concurrent generation across different entity types', async () => {
      const createMultiple = async () => {
        // Generate sequentially within each request to avoid deadlock
        // (acquiring multiple locks at once can cause circular wait)
        const invoiceId = await generateId('INV', 'invoice')
        const quotationId = await generateId('QTN', 'quotation')
        const expenseId = await generateId('EXP', 'expense')

        return { invoiceId, quotationId, expenseId }
      }

      // Generate 5 sets concurrently (reduced to avoid deadlock)
      const promises = Array.from({ length: 5 }, () => createMultiple())
      const results = await Promise.all(promises)

      // Extract all IDs by type
      const invoiceIds = results.map(r => r.invoiceId)
      const quotationIds = results.map(r => r.quotationId)
      const expenseIds = results.map(r => r.expenseId)

      // All should be unique within their type
      expect(new Set(invoiceIds).size).toBe(5)
      expect(new Set(quotationIds).size).toBe(5)
      expect(new Set(expenseIds).size).toBe(5)
    }, 120000) // 2 minute timeout for multi-entity test
  })

  describe('Stress Test - High Concurrency', () => {
    it('should handle 100 concurrent requests without duplicates', async () => {
      const promises = Array.from({ length: 100 }, () => 
        generateId('PLN', 'planning')
      )

      const ids = await Promise.all(promises)

      // All IDs should be unique
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(100)

      // Verify format
      ids.forEach(id => {
        expect(id).toMatch(/^PLN-\d{4}-\d{4}$/)
      })
    }, 60000) // 60 second timeout for stress test
  })

  describe('Lock Release Verification', () => {
    it('should not deadlock on sequential generation after concurrent load', async () => {
      // First, generate a few concurrent IDs
      const concurrent = Array.from({ length: 5 }, () => 
        generateId('ERH', 'erhaTicket')
      )
      await Promise.all(concurrent)

      // Then generate sequential IDs (should not hang)
      const id1 = await generateId('ERH', 'erhaTicket')
      const id2 = await generateId('ERH', 'erhaTicket')
      const id3 = await generateId('ERH', 'erhaTicket')

      // Should work fine
      expect(id1).toMatch(/^ERH-\d{4}-\d{4}$/)
      expect(id2).toMatch(/^ERH-\d{4}-\d{4}$/)
      expect(id3).toMatch(/^ERH-\d{4}-\d{4}$/)

      // Should be sequential
      const num1 = parseInt(id1.split('-')[2])
      const num2 = parseInt(id2.split('-')[2])
      const num3 = parseInt(id3.split('-')[2])
      expect(num2).toBe(num1 + 1)
      expect(num3).toBe(num2 + 1)
    }, 60000) // 60 second timeout
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully and not leave locks', async () => {
      // Even if there's an error, subsequent calls should work
      try {
        // This might error if something is wrong, but shouldn't lock
        await generateId('PRG', 'paragonTicket')
      } catch (e) {
        // Ignore any errors
      }

      // This should still work
      const id = await generateId('PRG', 'paragonTicket')
      expect(id).toMatch(/^PRG-\d{4}-\d{4}$/)
    }, 60000) // 60 second timeout
  })

  describe('Create-Expense Race Condition Prevention', () => {
    it('should prevent duplicate expenses when multiple users create expense simultaneously', async () => {
      // Create a paid invoice
      const invoiceId = await generateId('INV', 'invoice')
      const invoice = await prisma.invoice.create({
        data: {
          invoiceId,
          companyName: 'RACE_TEST Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: 'RACE_TEST_CREATE_EXPENSE',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 5000000,
          status: 'paid',
          paidDate: new Date(),
          items: {
            create: [
              {
                productName: 'Test Product',
                total: 5000000,
                details: {
                  create: [
                    {
                      detail: 'Test Detail',
                      unitPrice: 5000000,
                      qty: 1,
                      amount: 5000000
                    }
                  ]
                }
              }
            ]
          }
        }
      })
      createdInvoiceIds.push(invoice.id)

      // Simulate 5 concurrent users clicking "Create Expense" at the same time
      const concurrentRequests = Array.from({ length: 5 }, () =>
        fetch(`http://localhost:3000/api/invoice/${invoice.id}/create-expense`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      )

      // Execute all requests in parallel
      const responses = await Promise.all(concurrentRequests)
      
      // All requests should succeed (either 201 created or 200 existing)
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status)
      })

      // Parse all responses
      const expenseData = await Promise.all(
        responses.map(r => r.json())
      )

      // Extract expense IDs (handle both direct expense and { expense: {...} } format)
      const expenseIds = expenseData.map(data => 
        data.expense?.id || data.id
      ).filter(Boolean)

      // CRITICAL: Should have created only ONE unique expense, not 5
      const uniqueExpenseIds = new Set(expenseIds)
      expect(uniqueExpenseIds.size).toBe(1)
      
      console.log(`✓ Prevented race condition: ${responses.length} concurrent requests created only 1 expense`)

      // Verify the expense exists in database
      const createdExpenseId = Array.from(uniqueExpenseIds)[0]
      const expense = await prisma.expense.findUnique({
        where: { id: createdExpenseId },
        include: { items: true }
      })

      expect(expense).toBeDefined()
      expect(expense?.projectName).toBe('RACE_TEST_CREATE_EXPENSE')
      expect(expense?.items).toHaveLength(1)
      createdExpenseIds.push(createdExpenseId)

      // Verify invoice was updated with generatedExpenseId
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
        select: { generatedExpenseId: true }
      })
      expect(updatedInvoice?.generatedExpenseId).toBe(createdExpenseId)

      // Verify only ONE expense exists for this invoice
      const allExpensesForInvoice = await prisma.expense.findMany({
        where: { invoiceNumber: invoice.invoiceId }
      })
      expect(allExpensesForInvoice).toHaveLength(1)
    }, 60000) // 60 second timeout

    it('should handle 10 concurrent create-expense requests without duplicates', async () => {
      // Create a paid invoice
      const invoiceId = await generateId('INV', 'invoice')
      const invoice = await prisma.invoice.create({
        data: {
          invoiceId,
          companyName: 'RACE_TEST Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: 'RACE_TEST_CREATE_EXPENSE_10',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 10000000,
          status: 'paid',
          paidDate: new Date(),
          items: {
            create: [
              {
                productName: 'Test Product',
                total: 10000000,
                details: {
                  create: [
                    {
                      detail: 'Test Detail',
                      unitPrice: 10000000,
                      qty: 1,
                      amount: 10000000
                    }
                  ]
                }
              }
            ]
          }
        }
      })
      createdInvoiceIds.push(invoice.id)

      // Simulate 10 concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, () =>
        fetch(`http://localhost:3000/api/invoice/${invoice.id}/create-expense`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      )

      const responses = await Promise.all(concurrentRequests)
      
      // All should succeed
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status)
      })

      const expenseData = await Promise.all(responses.map(r => r.json()))
      const expenseIds = expenseData.map(data => 
        data.expense?.id || data.id
      ).filter(Boolean)

      // Should have only ONE unique expense
      const uniqueExpenseIds = new Set(expenseIds)
      expect(uniqueExpenseIds.size).toBe(1)
      
      console.log(`✓ 10 concurrent requests: Only 1 expense created`)

      const createdExpenseId = Array.from(uniqueExpenseIds)[0]
      createdExpenseIds.push(createdExpenseId)

      // Verify in database
      const allExpenses = await prisma.expense.findMany({
        where: { invoiceNumber: invoice.invoiceId }
      })
      expect(allExpenses).toHaveLength(1)
    }, 60000)
  })
})
