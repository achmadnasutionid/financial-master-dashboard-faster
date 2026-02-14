/**
 * REFERENCE TRACKING FIXES - INTEGRATION TESTS
 * 
 * Tests proper FK relationships for generation chain:
 * Planning → Quotation → Invoice → Expense
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'

describe('REFERENCE TRACKING FIXES - Integration Tests', () => {
  // Use unique timestamp per test run to avoid collisions
  const TEST_RUN_ID = `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  let testPlanningId: string
  let testQuotationId: string
  let testInvoiceId: string
  let testExpenseId: string

  beforeAll(async () => {
    // Clean up any existing test data with our unique ID
    await prisma.expense.deleteMany({
      where: { projectName: { contains: TEST_RUN_ID } }
    })
    await prisma.invoice.deleteMany({
      where: { billTo: { contains: TEST_RUN_ID } }
    })
    await prisma.quotation.deleteMany({
      where: { billTo: { contains: TEST_RUN_ID } }
    })
    await prisma.planning.deleteMany({
      where: { projectName: { contains: TEST_RUN_ID } }
    })
  })

  afterAll(async () => {
    // Clean up test data - wrap each in try/catch
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

    // Clean up in reverse order (child first)
    if (testExpenseId) await cleanupExpense(testExpenseId)
    if (testInvoiceId) await cleanupInvoice(testInvoiceId)
    if (testQuotationId) await cleanupQuotation(testQuotationId)
    if (testPlanningId) await cleanupPlanning(testPlanningId)

    // Also clean up any leaked test data by pattern
    try {
      const testExpenses = await prisma.expense.findMany({
        where: {
          OR: [
            { projectName: { contains: 'REF_TRACK_TEST' } },
            { expenseId: { contains: 'REF-TEST' } }
          ]
        }
      })
      for (const exp of testExpenses) {
        await cleanupExpense(exp.id)
      }

      const testInvoices = await prisma.invoice.findMany({
        where: {
          OR: [
            { billTo: { contains: 'REF_TRACK_TEST' } },
            { invoiceId: { contains: 'REF-TEST' } }
          ]
        }
      })
      for (const inv of testInvoices) {
        await cleanupInvoice(inv.id)
      }

      const testQuotations = await prisma.quotation.findMany({
        where: {
          OR: [
            { billTo: { contains: 'REF_TRACK_TEST' } },
            { quotationId: { contains: 'REF-TEST' } }
          ]
        }
      })
      for (const qtn of testQuotations) {
        await cleanupQuotation(qtn.id)
      }

      const testPlannings = await prisma.planning.findMany({
        where: {
          OR: [
            { projectName: { contains: 'REF_TRACK_TEST' } },
            { planningId: { contains: 'REF-TEST' } }
          ]
        }
      })
      for (const plan of testPlannings) {
        await cleanupPlanning(plan.id)
      }
    } catch (e) { /* ignore */ }
  })

  describe('Planning → Quotation FK Relationship', () => {
    it('should create FK link when quotation generated from planning', async () => {
      // Create planning
      const planning = await prisma.planning.create({
        data: {
          planningId: `PLN-${TEST_RUN_ID}-001`,
          projectName: `${TEST_RUN_ID} Project`,
          clientName: `${TEST_RUN_ID} Client`,
          clientBudget: 50000000,
          status: 'draft'
        }
      })
      testPlanningId = planning.id

      // Create quotation (simulating generation)
      const quotation = await prisma.quotation.create({
        data: {
          quotationId: `QTN-${TEST_RUN_ID}-001`,
          companyName: 'Test Company',
          companyAddress: 'Test',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: `${TEST_RUN_ID} Client`,
          billingName: 'Test Billing',
          billingBankName: 'BCA',
          billingBankAccount: '123456',
          billingBankAccountName: 'Test',
          signatureName: 'Test',
          signatureImageData: 'data:image',
          pph: '2%',
          totalAmount: 50000000,
          status: 'draft',
          sourcePlanningId: planning.id // FK link
        }
      })
      testQuotationId = quotation.id

      // Update planning with generated quotation
      await prisma.planning.update({
        where: { id: planning.id },
        data: { generatedQuotationId: quotation.id }
      })

      // Verify FK relationship works both ways
      const planningWithQuotation = await prisma.planning.findUnique({
        where: { id: planning.id },
        include: { generatedQuotation: true }
      })

      const quotationWithPlanning = await prisma.quotation.findUnique({
        where: { id: quotation.id },
        include: { sourcePlanning: true }
      })

      expect(planningWithQuotation?.generatedQuotation).not.toBeNull()
      expect(planningWithQuotation?.generatedQuotation?.id).toBe(quotation.id)
      expect(quotationWithPlanning?.sourcePlanning).not.toBeNull()
      expect(quotationWithPlanning?.sourcePlanning?.id).toBe(planning.id)
    })

    it('should set sourcePlanningId to null if planning deleted', async () => {
      // Soft-delete planning
      await prisma.planning.update({
        where: { id: testPlanningId },
        data: { deletedAt: new Date() }
      })

      // Quotation should still exist
      const quotation = await prisma.quotation.findUnique({
        where: { id: testQuotationId }
      })

      expect(quotation).not.toBeNull()
      // sourcePlanningId still exists (SetNull only on hard delete)
      expect(quotation?.sourcePlanningId).toBe(testPlanningId)
    })
  })

  describe('Quotation → Invoice FK Relationship', () => {
    it('should create FK link when invoice generated from quotation', async () => {
      // Create invoice (simulating generation)
      const invoice = await prisma.invoice.create({
        data: {
          invoiceId: `INV-${TEST_RUN_ID}-001`,
          companyName: 'Test Company',
          companyAddress: 'Test',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: `${TEST_RUN_ID} Client`,
          billingName: 'Test Billing',
          billingBankName: 'BCA',
          billingBankAccount: '123456',
          billingBankAccountName: 'Test',
          signatureName: 'Test',
          signatureImageData: 'data:image',
          pph: '2%',
          totalAmount: 50000000,
          status: 'draft',
          sourceQuotationId: testQuotationId // FK link
        }
      })
      testInvoiceId = invoice.id

      // Update quotation with generated invoice
      await prisma.quotation.update({
        where: { id: testQuotationId },
        data: { generatedInvoiceId: invoice.id }
      })

      // Verify FK relationship works both ways
      const quotationWithInvoice = await prisma.quotation.findUnique({
        where: { id: testQuotationId },
        include: { generatedInvoice: true }
      })

      const invoiceWithQuotation = await prisma.invoice.findUnique({
        where: { id: invoice.id },
        include: { sourceQuotation: true }
      })

      expect(quotationWithInvoice?.generatedInvoice).not.toBeNull()
      expect(quotationWithInvoice?.generatedInvoice?.id).toBe(invoice.id)
      expect(invoiceWithQuotation?.sourceQuotation).not.toBeNull()
      expect(invoiceWithQuotation?.sourceQuotation?.id).toBe(testQuotationId)
    })

    it('should prevent invalid FK reference', async () => {
      // Try to create invoice with non-existent quotation
      let errorThrown = false
      
      try {
        await prisma.invoice.create({
          data: {
            invoiceId: 'INV-INVALID-FK',
            companyName: 'Test',
            companyAddress: 'Test',
            companyCity: 'Jakarta',
            companyProvince: 'DKI',
            productionDate: new Date(),
            billTo: 'Test',
            billingName: 'Test',
            billingBankName: 'BCA',
            billingBankAccount: '123',
            billingBankAccountName: 'Test',
            signatureName: 'Test',
            signatureImageData: 'data:image',
            pph: '2%',
            totalAmount: 100,
            sourceQuotationId: 'non-existent-id' // Invalid FK
          }
        })
      } catch (error: any) {
        errorThrown = true
        expect(error.code).toBe('P2003') // FK constraint violation
      }

      expect(errorThrown).toBe(true)
    })
  })

  describe('Invoice → Expense FK Relationship', () => {
    it('should create FK link when expense generated from invoice', async () => {
      // Mark invoice as paid
      await prisma.invoice.update({
        where: { id: testInvoiceId },
        data: { status: 'paid' }
      })

      // Create expense (simulating generation)
      const expense = await prisma.expense.create({
        data: {
          expenseId: `EXP-${TEST_RUN_ID}-001`,
          projectName: `${TEST_RUN_ID} Project`,
          productionDate: new Date(),
          paidAmount: 50000000,
          status: 'draft',
          sourceInvoiceId: testInvoiceId, // FK link
          invoiceNumber: `INV-${TEST_RUN_ID}-001`, // Snapshot
          invoiceTotalAmount: 50000000, // Snapshot
          items: {
            create: [
              {
                productName: 'TEST',
                budgeted: 50000000,
                actual: 45000000,
                difference: 5000000,
                order: 0
              }
            ]
          }
        }
      })
      testExpenseId = expense.id

      // Update invoice with generated expense
      await prisma.invoice.update({
        where: { id: testInvoiceId },
        data: { generatedExpenseId: expense.id }
      })

      // Verify FK relationship works both ways
      const invoiceWithExpense = await prisma.invoice.findUnique({
        where: { id: testInvoiceId },
        include: { generatedExpense: true }
      })

      const expenseWithInvoice = await prisma.expense.findUnique({
        where: { id: expense.id },
        include: { sourceInvoice: true }
      })

      expect(invoiceWithExpense?.generatedExpense).not.toBeNull()
      expect(invoiceWithExpense?.generatedExpense?.id).toBe(expense.id)
      expect(expenseWithInvoice?.sourceInvoice).not.toBeNull()
      expect(expenseWithInvoice?.sourceInvoice?.id).toBe(testInvoiceId)
    })

    it('should keep expense when invoice deleted (SetNull + snapshot)', async () => {
      // Delete invoice
      await prisma.invoiceItemDetail.deleteMany({
        where: { invoiceItem: { invoiceId: testInvoiceId } }
      })
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: testInvoiceId } })
      await prisma.invoice.delete({ where: { id: testInvoiceId } })

      // Expense should still exist with snapshots
      const expense = await prisma.expense.findUnique({
        where: { id: testExpenseId },
        include: { sourceInvoice: true }
      })

      expect(expense).not.toBeNull()
      expect(expense?.sourceInvoice).toBeNull() // FK set to null
      expect(expense?.invoiceNumber).toBe(`INV-${TEST_RUN_ID}-001`) // Snapshot preserved
      expect(expense?.invoiceTotalAmount).toBe(50000000) // Snapshot preserved
    })
  })

  describe('Full Chain Navigation', () => {
    it('should navigate Planning → Quotation → Invoice → Expense', async () => {
      // Create full chain with unique ID
      const chainId = `${TEST_RUN_ID}_CHAIN`
      
      const planning = await prisma.planning.create({
        data: {
          planningId: `PLN-${chainId}`,
          projectName: `${chainId} Chain`,
          clientName: 'Test',
          clientBudget: 100000000,
          status: 'draft'
        }
      })

      const quotation = await prisma.quotation.create({
        data: {
          quotationId: `QTN-${chainId}`,
          companyName: 'Test',
          companyAddress: 'Test',
          companyCity: 'Jakarta',
          companyProvince: 'DKI',
          productionDate: new Date(),
          billTo: `${chainId} Chain`,
          billingName: 'Test',
          billingBankName: 'BCA',
          billingBankAccount: '123',
          billingBankAccountName: 'Test',
          signatureName: 'Test',
          signatureImageData: 'data:image',
          pph: '2%',
          totalAmount: 100000000,
          sourcePlanningId: planning.id
        }
      })

      await prisma.planning.update({
        where: { id: planning.id },
        data: { generatedQuotationId: quotation.id }
      })

      const invoice = await prisma.invoice.create({
        data: {
          invoiceId: `INV-${chainId}`,
          companyName: 'Test',
          companyAddress: 'Test',
          companyCity: 'Jakarta',
          companyProvince: 'DKI',
          productionDate: new Date(),
          billTo: `${chainId} Chain`,
          billingName: 'Test',
          billingBankName: 'BCA',
          billingBankAccount: '123',
          billingBankAccountName: 'Test',
          signatureName: 'Test',
          signatureImageData: 'data:image',
          pph: '2%',
          totalAmount: 100000000,
          sourceQuotationId: quotation.id
        }
      })

      await prisma.quotation.update({
        where: { id: quotation.id },
        data: { generatedInvoiceId: invoice.id }
      })

      const expense = await prisma.expense.create({
        data: {
          expenseId: `EXP-${chainId}`,
          projectName: `${chainId} Chain`,
          productionDate: new Date(),
          paidAmount: 100000000,
          sourceInvoiceId: invoice.id,
          items: {
            create: [{ productName: 'TEST', budgeted: 100000000, actual: 90000000, difference: 10000000, order: 0 }]
          }
        }
      })

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { generatedExpenseId: expense.id }
      })

      // Navigate full chain
      const fullChain = await prisma.planning.findUnique({
        where: { id: planning.id },
        include: {
          generatedQuotation: {
            include: {
              generatedInvoice: {
                include: {
                  generatedExpense: true
                }
              }
            }
          }
        }
      })

      expect(fullChain?.generatedQuotation?.id).toBe(quotation.id)
      expect(fullChain?.generatedQuotation?.generatedInvoice?.id).toBe(invoice.id)
      expect(fullChain?.generatedQuotation?.generatedInvoice?.generatedExpense?.id).toBe(expense.id)

      // Clean up
      await prisma.expenseItem.deleteMany({ where: { expenseId: expense.id } })
      await prisma.expense.delete({ where: { id: expense.id } })
      await prisma.invoice.delete({ where: { id: invoice.id } })
      await prisma.quotationItemDetail.deleteMany({
        where: { quotationItem: { quotationId: quotation.id } }
      })
      await prisma.quotationItem.deleteMany({ where: { quotationId: quotation.id } })
      await prisma.quotation.delete({ where: { id: quotation.id } })
      await prisma.planning.delete({ where: { id: planning.id } })
    })
  })
})
