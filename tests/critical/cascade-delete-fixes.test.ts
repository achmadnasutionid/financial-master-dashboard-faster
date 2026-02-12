/**
 * CASCADE DELETE FIXES - INTEGRATION TESTS
 * 
 * These tests verify the fixes for:
 * 1. Invoice->Expense CASCADE (now snapshot pattern)
 * 2. Product->ProductDetail soft-delete consistency
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'

describe('CASCADE DELETE FIXES - Integration Tests', () => {
  // Test data IDs
  let testInvoiceId: string
  let testExpenseId: string
  let testProductId: string
  let testProductDetailId: string
  let testPlanningId: string
  let testQuotationId: string | undefined

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.expense.deleteMany({
      where: { projectName: { contains: 'CASCADE_TEST' } }
    })
    await prisma.invoice.deleteMany({
      where: { billTo: { contains: 'CASCADE_TEST' } }
    })
    await prisma.planning.deleteMany({
      where: { projectName: { contains: 'CASCADE_TEST' } }
    })
    await prisma.productDetail.deleteMany({
      where: { detail: { contains: 'CASCADE_TEST' } }
    })
    await prisma.product.deleteMany({
      where: { name: { contains: 'CASCADE_TEST' } }
    })
  })

  afterAll(async () => {
    // Clean up test data - wrap each in try/catch to prevent failures
    const cleanupExpense = async (id: string) => {
      try {
        await prisma.expenseItem.deleteMany({ where: { expenseId: id } })
        await prisma.expense.delete({ where: { id } })
      } catch (e) { /* already deleted */ }
    }

    const cleanupInvoice = async (id: string) => {
      try {
        const exists = await prisma.invoice.findUnique({ where: { id } })
        if (exists) {
          await prisma.invoiceItemDetail.deleteMany({
            where: { invoiceItem: { invoiceId: id } }
          })
          await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
          await prisma.invoiceRemark.deleteMany({ where: { invoiceId: id } })
          await prisma.invoiceSignature.deleteMany({ where: { invoiceId: id } })
          await prisma.invoice.delete({ where: { id } })
        }
      } catch (e) { /* already deleted */ }
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
      } catch (e) { /* already deleted */ }
    }

    const cleanupPlanning = async (id: string) => {
      try {
        await prisma.planningItem.deleteMany({ where: { planningId: id } })
        await prisma.planning.delete({ where: { id } })
      } catch (e) { /* already deleted */ }
    }

    const cleanupProduct = async (id: string) => {
      try {
        await prisma.productDetail.deleteMany({ where: { productId: id } })
        await prisma.product.delete({ where: { id } })
      } catch (e) { /* already deleted */ }
    }

    // Clean up in reverse order (child first)
    if (testExpenseId) await cleanupExpense(testExpenseId)
    if (testInvoiceId) await cleanupInvoice(testInvoiceId)
    if (testQuotationId) await cleanupQuotation(testQuotationId)
    if (testPlanningId) await cleanupPlanning(testPlanningId)
    if (testProductId) await cleanupProduct(testProductId)

    // Also clean up any leaked test data by pattern
    try {
      const testExpenses = await prisma.expense.findMany({
        where: {
          OR: [
            { projectName: { contains: 'CASCADE_TEST' } },
            { expenseId: { contains: 'CASCADE-TEST' } }
          ]
        }
      })
      for (const exp of testExpenses) {
        await cleanupExpense(exp.id)
      }

      const testProducts = await prisma.product.findMany({
        where: { name: { contains: 'CASCADE_TEST' } }
      })
      for (const prod of testProducts) {
        await cleanupProduct(prod.id)
      }
    } catch (e) { /* ignore */ }
  })

  // ============================================
  // TEST GROUP 1: EXPENSE-INVOICE DECOUPLING
  // ============================================

  describe('Expense-Invoice Snapshot Pattern', () => {
    it('should create expense with invoice snapshots (no FK)', async () => {
      // Create planning first
      const planning = await prisma.planning.create({
        data: {
          planningId: 'PLN-CASCADE-TEST-001',
          projectName: 'CASCADE_TEST Project 1',
          clientName: 'CASCADE_TEST Client',
          clientBudget: 100000000,
          status: 'draft',
          items: {
            create: [
              { productName: 'PHOTOGRAPHER', budget: 50000000, expense: 40000000, order: 0 }
            ]
          }
        }
      })
      testPlanningId = planning.id

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceId: 'INV-CASCADE-TEST-001',
          planningId: planning.id,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Test City',
          companyProvince: 'Test Province',
          productionDate: new Date('2024-01-15'),
          paidDate: new Date('2024-01-22'),
          billTo: 'CASCADE_TEST Client',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2%',
          totalAmount: 98000000,
          status: 'paid',
          items: {
            create: [
              {
                productName: 'PHOTOGRAPHER',
                total: 50000000,
                order: 0,
                details: {
                  create: [
                    { detail: 'Day 1', unitPrice: 25000000, qty: 2, amount: 50000000 }
                  ]
                }
              }
            ]
          }
        },
        include: { items: { include: { details: true } } }
      })
      testInvoiceId = invoice.id

      // Create expense with snapshots
      const expense = await prisma.expense.create({
        data: {
          expenseId: 'EXP-CASCADE-TEST-001',
          invoiceId: invoice.id,
          planningId: planning.id,
          // Snapshot fields
          invoiceNumber: invoice.invoiceId,
          invoiceProductionDate: invoice.productionDate,
          invoiceTotalAmount: invoice.totalAmount,
          invoicePaidDate: invoice.paidDate,
          planningNumber: planning.planningId,
          planningClientName: planning.clientName,
          // Expense data
          projectName: 'CASCADE_TEST Project 1',
          productionDate: invoice.productionDate,
          clientBudget: planning.clientBudget,
          paidAmount: invoice.totalAmount,
          status: 'draft',
          items: {
            create: [
              { productName: 'PHOTOGRAPHER', budgeted: 50000000, actual: 40000000, difference: 10000000, order: 0 }
            ]
          }
        },
        include: { items: true }
      })
      testExpenseId = expense.id

      // Verify expense created with snapshots
      expect(expense.invoiceNumber).toBe('INV-CASCADE-TEST-001')
      expect(expense.invoiceTotalAmount).toBe(98000000)
      expect(expense.planningNumber).toBe('PLN-CASCADE-TEST-001')
      expect(expense.planningClientName).toBe('CASCADE_TEST Client')
      expect(expense.items.length).toBe(1)
    })

    it('should preserve expense when invoice is soft-deleted', async () => {
      // Verify we have the test data from previous test
      if (!testInvoiceId || !testExpenseId) {
        throw new Error('Test data not initialized. Run create test first.')
      }

      // Soft-delete the invoice
      await prisma.invoice.update({
        where: { id: testInvoiceId },
        data: { deletedAt: new Date() }
      })

      // Verify invoice is soft-deleted
      const deletedInvoice = await prisma.invoice.findUnique({
        where: { id: testInvoiceId }
      })
      expect(deletedInvoice?.deletedAt).not.toBeNull()

      // Verify expense still exists and has snapshot data
      const expense = await prisma.expense.findUnique({
        where: { id: testExpenseId },
        include: { items: true }
      })

      expect(expense).not.toBeNull()
      expect(expense?.invoiceNumber).toBe('INV-CASCADE-TEST-001')
      expect(expense?.invoiceTotalAmount).toBe(98000000)
      expect(expense?.invoiceProductionDate).toEqual(new Date('2024-01-15'))
      expect(expense?.items.length).toBe(1)
      expect(expense?.items[0].actual).toBe(40000000)
    })

    it('should preserve expense when invoice is hard-deleted', async () => {
      // Verify we have the test data
      if (!testInvoiceId || !testExpenseId) {
        throw new Error('Test data not initialized. Run create test first.')
      }

      // Check if invoice exists before trying to delete
      const existingInvoice = await prisma.invoice.findUnique({
        where: { id: testInvoiceId }
      })
      
      if (existingInvoice) {
        // Hard-delete the invoice
        await prisma.invoiceItemDetail.deleteMany({
          where: { invoiceItem: { invoiceId: testInvoiceId } }
        })
        await prisma.invoiceItem.deleteMany({
          where: { invoiceId: testInvoiceId }
        })
        await prisma.invoiceRemark.deleteMany({
          where: { invoiceId: testInvoiceId }
        })
        await prisma.invoiceSignature.deleteMany({
          where: { invoiceId: testInvoiceId }
        })
        await prisma.invoice.delete({
          where: { id: testInvoiceId }
        })
      }

      // Verify invoice is gone
      const deletedInvoice = await prisma.invoice.findUnique({
        where: { id: testInvoiceId }
      })
      expect(deletedInvoice).toBeNull()

      // Verify expense STILL EXISTS with all data intact
      const expense = await prisma.expense.findUnique({
        where: { id: testExpenseId },
        include: { items: true }
      })

      expect(expense).not.toBeNull()
      expect(expense?.expenseId).toBe('EXP-CASCADE-TEST-001')
      expect(expense?.invoiceNumber).toBe('INV-CASCADE-TEST-001') // Snapshot preserved!
      expect(expense?.invoiceTotalAmount).toBe(98000000) // Snapshot preserved!
      expect(expense?.paidAmount).toBe(98000000)
      expect(expense?.items.length).toBe(1)
      expect(expense?.items[0].actual).toBe(40000000)
    })

    it('should allow querying expenses by invoice snapshot', async () => {
      // Verify we have the test expense
      if (!testExpenseId) {
        throw new Error('Test data not initialized. Run create test first.')
      }

      // Query by invoiceNumber (snapshot field, not FK)
      const expenses = await prisma.expense.findMany({
        where: { invoiceNumber: 'INV-CASCADE-TEST-001' }
      })

      expect(expenses.length).toBeGreaterThan(0)
      expect(expenses[0].invoiceNumber).toBe('INV-CASCADE-TEST-001')
    })
  })

  // ============================================
  // TEST GROUP 2: PRODUCT-PRODUCTDETAIL SOFT DELETE
  // ============================================

  describe('Product-ProductDetail Soft Delete Consistency', () => {
    it('should create product with details', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'CASCADE_TEST_PRODUCT',
          details: {
            create: [
              { detail: 'CASCADE_TEST Detail 1', unitPrice: 1000000, qty: 1 },
              { detail: 'CASCADE_TEST Detail 2', unitPrice: 2000000, qty: 2 }
            ]
          }
        },
        include: { details: true }
      })

      testProductId = product.id
      testProductDetailId = product.details[0].id

      expect(product.details.length).toBe(2)
      expect(product.deletedAt).toBeNull()
      expect(product.details[0].deletedAt).toBeNull() // Field exists and is null (not deleted)
    })

    it('should soft-delete product AND details together', async () => {
      const now = new Date()

      // Soft-delete product and its details in transaction
      await prisma.$transaction([
        prisma.product.update({
          where: { id: testProductId },
          data: { deletedAt: now }
        }),
        prisma.productDetail.updateMany({
          where: { productId: testProductId },
          data: { deletedAt: now }
        })
      ])

      // Verify product is soft-deleted
      const product = await prisma.product.findUnique({
        where: { id: testProductId }
      })
      expect(product?.deletedAt).not.toBeNull()

      // Verify ALL details are soft-deleted
      const details = await prisma.productDetail.findMany({
        where: { productId: testProductId }
      })
      expect(details.length).toBe(2)
      expect(details[0].deletedAt).not.toBeNull()
      expect(details[1].deletedAt).not.toBeNull()
    })

    it('should exclude soft-deleted details in product queries', async () => {
      // Query product excluding deleted details
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
        include: {
          details: {
            where: { deletedAt: null }
          }
        }
      })

      // Should return product but with 0 details (all soft-deleted)
      expect(product).not.toBeNull()
      expect(product?.details.length).toBe(0)
    })

    it('should restore product AND details together', async () => {
      // Restore product and its details in transaction
      await prisma.$transaction([
        prisma.product.update({
          where: { id: testProductId },
          data: { deletedAt: null }
        }),
        prisma.productDetail.updateMany({
          where: { productId: testProductId },
          data: { deletedAt: null }
        })
      ])

      // Verify product is restored
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
        include: {
          details: {
            where: { deletedAt: null }
          }
        }
      })

      expect(product?.deletedAt).toBeNull()
      expect(product?.details.length).toBe(2) // Both details restored
    })

    it('should not allow orphaned details (database constraint)', async () => {
      // This test verifies the Restrict constraint
      // Try to hard-delete product with details (should fail)
      
      let errorThrown = false
      try {
        await prisma.product.delete({
          where: { id: testProductId }
        })
      } catch (error: any) {
        errorThrown = true
        // Should fail due to FK constraint RESTRICT
        expect(error.code).toBe('P2003') // Prisma foreign key constraint error
      }

      expect(errorThrown).toBe(true)
    })
  })

  // ============================================
  // TEST GROUP 3: DASHBOARD CALCULATIONS STILL WORK
  // ============================================

  describe('Dashboard Calculations After Migration', () => {
    it('should calculate expense stats correctly', async () => {
      const expenses = await prisma.expense.findMany({
        where: { 
          status: 'final',
          deletedAt: null 
        },
        include: { items: true }
      })

      // Calculate stats (same as dashboard-utils.ts)
      let grossProfit = 0
      let totalActualExpenses = 0

      expenses.forEach((exp) => {
        const totalPaid = exp.paidAmount || 0
        const totalActual = exp.items.reduce((sum, item) => sum + item.actual, 0)
        
        grossProfit += totalPaid
        totalActualExpenses += totalActual
      })

      const netProfit = grossProfit - totalActualExpenses

      // Should calculate without errors (even with snapshot pattern)
      expect(typeof grossProfit).toBe('number')
      expect(typeof netProfit).toBe('number')
    })

    it('should query expenses with snapshot filters', async () => {
      // Create test expense with snapshot
      const testExpense = await prisma.expense.create({
        data: {
          expenseId: 'EXP-SNAPSHOT-TEST',
          invoiceNumber: 'INV-SNAPSHOT-TEST',
          planningNumber: 'PLN-SNAPSHOT-TEST',
          projectName: 'CASCADE_TEST Snapshot Query',
          productionDate: new Date(),
          paidAmount: 50000000,
          status: 'final',
          items: {
            create: [
              { productName: 'PHOTOGRAPHER', budgeted: 50000000, actual: 40000000, difference: 10000000, order: 0 }
            ]
          }
        }
      })

      // Query by snapshot fields
      const byInvoice = await prisma.expense.findMany({
        where: { invoiceNumber: 'INV-SNAPSHOT-TEST' }
      })

      const byPlanning = await prisma.expense.findMany({
        where: { planningNumber: 'PLN-SNAPSHOT-TEST' }
      })

      expect(byInvoice.length).toBe(1)
      expect(byPlanning.length).toBe(1)
      expect(byInvoice[0].id).toBe(testExpense.id)
      expect(byPlanning[0].id).toBe(testExpense.id)

      // Clean up
      await prisma.expenseItem.deleteMany({ where: { expenseId: testExpense.id } })
      await prisma.expense.delete({ where: { id: testExpense.id } })
    })
  })

  // ============================================
  // TEST GROUP 4: BACKWARD COMPATIBILITY
  // ============================================

  describe('Backward Compatibility', () => {
    it('should handle expenses without snapshots (legacy data)', async () => {
      // Create expense without snapshots (simulate old data)
      const legacyExpense = await prisma.expense.create({
        data: {
          expenseId: 'EXP-LEGACY-TEST',
          projectName: 'CASCADE_TEST Legacy',
          productionDate: new Date(),
          paidAmount: 30000000,
          status: 'draft',
          // No snapshot fields set
          items: {
            create: [
              { productName: 'PHOTOGRAPHER', budgeted: 30000000, actual: 25000000, difference: 5000000, order: 0 }
            ]
          }
        },
        include: { items: true }
      })

      // Should work fine with null snapshots
      expect(legacyExpense.invoiceNumber).toBeNull()
      expect(legacyExpense.planningNumber).toBeNull()
      expect(legacyExpense.items.length).toBe(1)

      // Can query and calculate normally
      const totalActual = legacyExpense.items.reduce((sum, item) => sum + item.actual, 0)
      expect(totalActual).toBe(25000000)

      // Clean up
      await prisma.expenseItem.deleteMany({ where: { expenseId: legacyExpense.id } })
      await prisma.expense.delete({ where: { id: legacyExpense.id } })
    })

    it('should allow expenses with invoiceId but no invoice (after invoice deleted)', async () => {
      // This simulates an expense that had invoiceId but invoice was deleted
      const orphanedExpense = await prisma.expense.create({
        data: {
          expenseId: 'EXP-ORPHANED-TEST',
          invoiceId: 'non-existent-invoice-id', // Points to nothing
          invoiceNumber: 'INV-DELETED-001', // Snapshot preserved
          projectName: 'CASCADE_TEST Orphaned',
          productionDate: new Date(),
          paidAmount: 40000000,
          status: 'final',
          items: {
            create: [
              { productName: 'PHOTOGRAPHER', budgeted: 40000000, actual: 35000000, difference: 5000000, order: 0 }
            ]
          }
        }
      })

      // Should work fine - has snapshot data
      expect(orphanedExpense.invoiceNumber).toBe('INV-DELETED-001')
      expect(orphanedExpense.paidAmount).toBe(40000000)

      // Can still calculate profit
      const expense = await prisma.expense.findUnique({
        where: { id: orphanedExpense.id },
        include: { items: true }
      })

      const totalActual = expense!.items.reduce((sum, item) => sum + item.actual, 0)
      const profit = expense!.paidAmount - totalActual
      expect(profit).toBe(5000000)

      // Clean up
      await prisma.expenseItem.deleteMany({ where: { expenseId: orphanedExpense.id } })
      await prisma.expense.delete({ where: { id: orphanedExpense.id } })
    })
  })
})
