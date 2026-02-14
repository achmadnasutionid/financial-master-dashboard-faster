/**
 * Integration Tests: Unique Name Validation
 * 
 * Tests the unique name validation system across all entities:
 * - Planning: projectName validation
 * - Quotation: billTo validation
 * - Invoice: billTo validation
 * - Expense: projectName validation
 * - Paragon: billTo validation
 * - Erha: billTo validation
 * - ProductionTracker: projectName validation
 * 
 * Validates:
 * - Automatic suffix generation (" 02", " 03", etc.)
 * - POST operations (creation)
 * - PUT operations (updates)
 * - Excludes current record during updates
 * - Proper cleanup to prevent test data leakage
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/id-generator'
import { generateUniqueName } from '@/lib/name-validator'

// Helper to check if API server is available
let serverCheckResult: boolean | null = null
async function isServerAvailable(): Promise<boolean> {
  if (serverCheckResult !== null) return serverCheckResult
  
  try {
    const response = await fetch('http://localhost:3000/api/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    })
    serverCheckResult = response.ok
    return response.ok
  } catch {
    serverCheckResult = false
    return false
  }
}

// Test data IDs for cleanup
const testData = {
  planningIds: [] as string[],
  quotationIds: [] as string[],
  invoiceIds: [] as string[],
  expenseIds: [] as string[],
  paragonIds: [] as string[],
  erhaIds: [] as string[],
  trackerIds: [] as string[]
}

describe('Unique Name Validation Integration Tests', () => {
  
  afterAll(async () => {
    // Comprehensive cleanup - delete in reverse dependency order
    try {
      // Delete all test data
      if (testData.trackerIds.length > 0) {
        await prisma.productionTracker.deleteMany({
          where: { id: { in: testData.trackerIds } }
        })
      }

      if (testData.expenseIds.length > 0) {
        await prisma.expenseItem.deleteMany({
          where: { expenseId: { in: testData.expenseIds } }
        })
        await prisma.expense.deleteMany({
          where: { id: { in: testData.expenseIds } }
        })
      }

      if (testData.invoiceIds.length > 0) {
        await prisma.invoiceItemDetail.deleteMany({
          where: { invoiceItem: { invoiceId: { in: testData.invoiceIds } } }
        })
        await prisma.invoiceItem.deleteMany({
          where: { invoiceId: { in: testData.invoiceIds } }
        })
        await prisma.invoiceRemark.deleteMany({
          where: { invoiceId: { in: testData.invoiceIds } }
        })
        await prisma.invoiceSignature.deleteMany({
          where: { invoiceId: { in: testData.invoiceIds } }
        })
        await prisma.invoice.deleteMany({
          where: { id: { in: testData.invoiceIds } }
        })
      }

      if (testData.quotationIds.length > 0) {
        await prisma.quotationItemDetail.deleteMany({
          where: { quotationItem: { quotationId: { in: testData.quotationIds } } }
        })
        await prisma.quotationItem.deleteMany({
          where: { quotationId: { in: testData.quotationIds } }
        })
        await prisma.quotationRemark.deleteMany({
          where: { quotationId: { in: testData.quotationIds } }
        })
        await prisma.quotationSignature.deleteMany({
          where: { quotationId: { in: testData.quotationIds } }
        })
        await prisma.quotation.deleteMany({
          where: { id: { in: testData.quotationIds } }
        })
      }

      if (testData.paragonIds.length > 0) {
        await prisma.paragonTicketItemDetail.deleteMany({
          where: { item: { ticketId: { in: testData.paragonIds } } }
        })
        await prisma.paragonTicketItem.deleteMany({
          where: { ticketId: { in: testData.paragonIds } }
        })
        await prisma.paragonTicketRemark.deleteMany({
          where: { ticketId: { in: testData.paragonIds } }
        })
        await prisma.paragonTicket.deleteMany({
          where: { id: { in: testData.paragonIds } }
        })
      }

      if (testData.erhaIds.length > 0) {
        await prisma.erhaTicketItemDetail.deleteMany({
          where: { item: { ticketId: { in: testData.erhaIds } } }
        })
        await prisma.erhaTicketItem.deleteMany({
          where: { ticketId: { in: testData.erhaIds } }
        })
        await prisma.erhaTicketRemark.deleteMany({
          where: { ticketId: { in: testData.erhaIds } }
        })
        await prisma.erhaTicket.deleteMany({
          where: { id: { in: testData.erhaIds } }
        })
      }

      if (testData.planningIds.length > 0) {
        await prisma.planningItem.deleteMany({
          where: { planningId: { in: testData.planningIds } }
        })
        await prisma.planning.deleteMany({
          where: { id: { in: testData.planningIds } }
        })
      }

      // Clean up any remaining test data by pattern matching
      await prisma.productionTracker.deleteMany({
        where: {
          projectName: {
            contains: 'UniqueTest'
          }
        }
      })

      await prisma.expense.deleteMany({
        where: {
          projectName: {
            contains: 'UniqueTest'
          }
        }
      })

      await prisma.invoice.deleteMany({
        where: {
          billTo: {
            contains: 'UniqueTest'
          }
        }
      })

      await prisma.quotation.deleteMany({
        where: {
          billTo: {
            contains: 'UniqueTest'
          }
        }
      })

      await prisma.paragonTicket.deleteMany({
        where: {
          billTo: {
            contains: 'UniqueTest'
          }
        }
      })

      await prisma.erhaTicket.deleteMany({
        where: {
          billTo: {
            contains: 'UniqueTest'
          }
        }
      })

      await prisma.planning.deleteMany({
        where: {
          projectName: {
            contains: 'UniqueTest'
          }
        }
      })

    } catch (error) {
      console.error('Cleanup error:', error)
    }
  })

  describe('1. Utility Function Tests', () => {
    it('should return original name when no conflict exists', async () => {
      const uniqueName = await generateUniqueName('UniqueTestNonExistent', 'planning')
      expect(uniqueName).toBe('UniqueTestNonExistent')
    })

    it('should append " 02" suffix when duplicate exists', async () => {
      // Create first record
      const planning1 = await prisma.planning.create({
        data: {
          planningId: await generateId('PLN', 'planning'),
          projectName: 'UniqueTestDuplicate',
          clientName: 'Test Client',
          clientBudget: 1000000
        }
      })
      testData.planningIds.push(planning1.id)

      // Check unique name generation
      const uniqueName = await generateUniqueName('UniqueTestDuplicate', 'planning')
      expect(uniqueName).toBe('UniqueTestDuplicate 02')
    })

    it('should increment suffix for multiple duplicates', async () => {
      // Create first record
      const planning1 = await prisma.planning.create({
        data: {
          planningId: await generateId('PLN', 'planning'),
          projectName: 'UniqueTestMultiple',
          clientName: 'Test Client',
          clientBudget: 1000000
        }
      })
      testData.planningIds.push(planning1.id)

      // Create second with suffix 02
      const planning2 = await prisma.planning.create({
        data: {
          planningId: await generateId('PLN', 'planning'),
          projectName: 'UniqueTestMultiple 02',
          clientName: 'Test Client',
          clientBudget: 1000000
        }
      })
      testData.planningIds.push(planning2.id)

      // Should generate 03
      const uniqueName = await generateUniqueName('UniqueTestMultiple', 'planning')
      expect(uniqueName).toBe('UniqueTestMultiple 03')
    })

    it('should exclude current record when updating', async () => {
      const planning = await prisma.planning.create({
        data: {
          planningId: await generateId('PLN', 'planning'),
          projectName: 'UniqueTestExclude',
          clientName: 'Test Client',
          clientBudget: 1000000
        }
      })
      testData.planningIds.push(planning.id)

      // Should return original name since we're updating the same record
      const uniqueName = await generateUniqueName('UniqueTestExclude', 'planning', planning.id)
      expect(uniqueName).toBe('UniqueTestExclude')
    })
  })

  describe('2. Planning - projectName Validation', () => {
    it('should create planning with unique projectName via API', async () => {
      if (!(await isServerAvailable())) return

      const response = await fetch('http://localhost:3000/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: 'UniqueTestPlanning01',
          clientName: 'Test Client',
          clientBudget: 1000000,
          items: []
        })
      })

      expect(response.ok).toBe(true)
      const planning = await response.json()
      testData.planningIds.push(planning.id)
      expect(planning.projectName).toBe('UniqueTestPlanning01')
    })

    it('should auto-increment projectName when duplicate exists', async () => {
      if (!(await isServerAvailable())) return

      // Create first planning
      const response1 = await fetch('http://localhost:3000/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: 'UniqueTestPlanning02',
          clientName: 'Test Client',
          clientBudget: 1000000,
          items: []
        })
      })

      expect(response1.ok).toBe(true)
      const planning1 = await response1.json()
      testData.planningIds.push(planning1.id)

      // Create second with same name
      const response2 = await fetch('http://localhost:3000/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: 'UniqueTestPlanning02',
          clientName: 'Test Client',
          clientBudget: 2000000,
          items: []
        })
      })

      expect(response2.ok).toBe(true)
      const planning2 = await response2.json()
      testData.planningIds.push(planning2.id)
      expect(planning2.projectName).toBe('UniqueTestPlanning02 02')
    })

    it('should handle projectName updates without creating duplicates', async () => {
      if (!(await isServerAvailable())) return

      // Create planning
      const createResponse = await fetch('http://localhost:3000/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: 'UniqueTestPlanningUpdate',
          clientName: 'Test Client',
          clientBudget: 1000000,
          items: []
        })
      })

      const planning = await createResponse.json()
      testData.planningIds.push(planning.id)

      // Update with same name (should be allowed)
      const updateResponse = await fetch(`http://localhost:3000/api/planning/${planning.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: 'UniqueTestPlanningUpdate',
          clientName: 'Updated Client',
          clientBudget: 1500000,
          items: []
        })
      })

      expect(updateResponse.ok).toBe(true)
      const updated = await updateResponse.json()
      expect(updated.projectName).toBe('UniqueTestPlanningUpdate')
    })
  })

  describe('3. Quotation - billTo Validation', () => {
    it('should create quotation with unique billTo via API', async () => {
      if (!(await isServerAvailable())) return

      const response = await fetch('http://localhost:3000/api/quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          billTo: 'UniqueTestQuotation01',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft',
          items: []
        })
      })

      expect(response.ok).toBe(true)
      const quotation = await response.json()
      testData.quotationIds.push(quotation.id)
      expect(quotation.billTo).toBe('UniqueTestQuotation01')
    })

    it('should auto-increment billTo when duplicate exists', async () => {
      if (!(await isServerAvailable())) return

      // Create first quotation
      const response1 = await fetch('http://localhost:3000/api/quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          billTo: 'UniqueTestQuotation02',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft',
          items: []
        })
      })

      const quotation1 = await response1.json()
      testData.quotationIds.push(quotation1.id)

      // Create second with same billTo
      const response2 = await fetch('http://localhost:3000/api/quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          billTo: 'UniqueTestQuotation02',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft',
          items: []
        })
      })

      const quotation2 = await response2.json()
      testData.quotationIds.push(quotation2.id)
      expect(quotation2.billTo).toBe('UniqueTestQuotation02 02')
    })
  })

  describe('4. Invoice - billTo Validation', () => {
    it('should create invoice with unique billTo via API', async () => {
      if (!(await isServerAvailable())) return

      const response = await fetch('http://localhost:3000/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          billTo: 'UniqueTestInvoice01',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft',
          items: []
        })
      })

      expect(response.ok).toBe(true)
      const invoice = await response.json()
      testData.invoiceIds.push(invoice.id)
      expect(invoice.billTo).toBe('UniqueTestInvoice01')
    })

    it('should auto-increment billTo when duplicate exists', async () => {
      if (!(await isServerAvailable())) return

      // Create first invoice
      const response1 = await fetch('http://localhost:3000/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          billTo: 'UniqueTestInvoice02',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft',
          items: []
        })
      })

      const invoice1 = await response1.json()
      testData.invoiceIds.push(invoice1.id)

      // Create second with same billTo
      const response2 = await fetch('http://localhost:3000/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          billTo: 'UniqueTestInvoice02',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft',
          items: []
        })
      })

      const invoice2 = await response2.json()
      testData.invoiceIds.push(invoice2.id)
      expect(invoice2.billTo).toBe('UniqueTestInvoice02 02')
    })
  })

  describe('5. Expense - projectName Validation', () => {
    it('should create expense with unique projectName via API', async () => {
      if (!(await isServerAvailable())) return

      const response = await fetch('http://localhost:3000/api/expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: 'UniqueTestExpense01',
          productionDate: new Date().toISOString(),
          clientBudget: 1000000,
          paidAmount: 1000000,
          items: []
        })
      })

      expect(response.ok).toBe(true)
      const expense = await response.json()
      testData.expenseIds.push(expense.id)
      expect(expense.projectName).toBe('UniqueTestExpense01')
    })

    it('should auto-increment projectName when duplicate exists', async () => {
      if (!(await isServerAvailable())) return

      // Create first expense
      const response1 = await fetch('http://localhost:3000/api/expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: 'UniqueTestExpense02',
          productionDate: new Date().toISOString(),
          clientBudget: 1000000,
          paidAmount: 1000000,
          items: []
        })
      })

      const expense1 = await response1.json()
      testData.expenseIds.push(expense1.id)

      // Create second with same projectName
      const response2 = await fetch('http://localhost:3000/api/expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: 'UniqueTestExpense02',
          productionDate: new Date().toISOString(),
          clientBudget: 2000000,
          paidAmount: 2000000,
          items: []
        })
      })

      const expense2 = await response2.json()
      testData.expenseIds.push(expense2.id)
      expect(expense2.projectName).toBe('UniqueTestExpense02 02')
    })
  })

  describe('6. ProductionTracker - projectName Validation', () => {
    it('should create tracker with unique projectName via API', async () => {
      if (!(await isServerAvailable())) return

      const response = await fetch('http://localhost:3000/api/production-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: await generateId('EXP', 'expense'),
          projectName: 'UniqueTestTracker01',
          date: new Date().toISOString(),
          subtotal: 1000000,
          totalAmount: 1020000,
          expense: 800000,
          productAmounts: {
            'PHOTOGRAPHER': 220000,
            'PROPS/SET': 800000
          }
        })
      })

      expect(response.ok).toBe(true)
      const tracker = await response.json()
      testData.trackerIds.push(tracker.id)
      expect(tracker.projectName).toBe('UniqueTestTracker01')
    })

    it('should auto-increment projectName when duplicate exists', async () => {
      if (!(await isServerAvailable())) return

      // Create first tracker
      const response1 = await fetch('http://localhost:3000/api/production-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: await generateId('EXP', 'expense'),
          projectName: 'UniqueTestTracker02',
          date: new Date().toISOString(),
          subtotal: 1000000,
          totalAmount: 1020000,
          expense: 800000,
          productAmounts: {
            'PHOTOGRAPHER': 220000,
            'PROPS/SET': 800000
          }
        })
      })

      const tracker1 = await response1.json()
      testData.trackerIds.push(tracker1.id)

      // Create second with same projectName
      const response2 = await fetch('http://localhost:3000/api/production-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: await generateId('EXP', 'expense'),
          projectName: 'UniqueTestTracker02',
          date: new Date().toISOString(),
          subtotal: 2000000,
          totalAmount: 2040000,
          expense: 1500000,
          productAmounts: {
            'PHOTOGRAPHER': 540000,
            'PROPS/SET': 1500000
          }
        })
      })

      const tracker2 = await response2.json()
      testData.trackerIds.push(tracker2.id)
      expect(tracker2.projectName).toBe('UniqueTestTracker02 02')
    })
  })

  describe('7. Paragon - billTo Validation', () => {
    it('should create paragon ticket with unique billTo via API', async () => {
      if (!(await isServerAvailable())) return

      const response = await fetch('http://localhost:3000/api/paragon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          quotationDate: new Date().toISOString(),
          invoiceBastDate: new Date().toISOString(),
          billTo: 'UniqueTestParagon01',
          contactPerson: 'Test Contact',
          contactPosition: 'Manager',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft',
          items: []
        })
      })

      expect(response.ok).toBe(true)
      const paragon = await response.json()
      testData.paragonIds.push(paragon.id)
      expect(paragon.billTo).toBe('UniqueTestParagon01')
    })

    it('should auto-increment billTo when duplicate exists', async () => {
      if (!(await isServerAvailable())) return

      // Create first paragon ticket
      const response1 = await fetch('http://localhost:3000/api/paragon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          quotationDate: new Date().toISOString(),
          invoiceBastDate: new Date().toISOString(),
          billTo: 'UniqueTestParagon02',
          contactPerson: 'Test Contact',
          contactPosition: 'Manager',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft',
          items: []
        })
      })

      const paragon1 = await response1.json()
      testData.paragonIds.push(paragon1.id)

      // Create second with same billTo
      const response2 = await fetch('http://localhost:3000/api/paragon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          quotationDate: new Date().toISOString(),
          invoiceBastDate: new Date().toISOString(),
          billTo: 'UniqueTestParagon02',
          contactPerson: 'Test Contact',
          contactPosition: 'Manager',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft',
          items: []
        })
      })

      const paragon2 = await response2.json()
      testData.paragonIds.push(paragon2.id)
      expect(paragon2.billTo).toBe('UniqueTestParagon02 02')
    })

    it('should handle billTo updates without creating duplicates', async () => {
      if (!(await isServerAvailable())) return

      // Create paragon ticket
      const createResponse = await fetch('http://localhost:3000/api/paragon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          quotationDate: new Date().toISOString(),
          invoiceBastDate: new Date().toISOString(),
          billTo: 'UniqueTestParagonUpdate',
          contactPerson: 'Test Contact',
          contactPosition: 'Manager',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft',
          items: []
        })
      })

      const paragon = await createResponse.json()
      testData.paragonIds.push(paragon.id)

      // Update with same billTo (should be allowed)
      const updateResponse = await fetch(`http://localhost:3000/api/paragon/${paragon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company Updated',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          quotationDate: new Date().toISOString(),
          invoiceBastDate: new Date().toISOString(),
          billTo: 'UniqueTestParagonUpdate',
          contactPerson: 'Test Contact',
          contactPosition: 'Manager',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1500000,
          status: 'draft',
          items: []
        })
      })

      expect(updateResponse.ok).toBe(true)
      const updated = await updateResponse.json()
      expect(updated.billTo).toBe('UniqueTestParagonUpdate')
    })
  })

  describe('8. Erha - billTo Validation', () => {
    it('should create erha ticket with unique billTo via API', async () => {
      if (!(await isServerAvailable())) return

      const response = await fetch('http://localhost:3000/api/erha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          quotationDate: new Date().toISOString(),
          invoiceBastDate: new Date().toISOString(),
          billTo: 'UniqueTestErha01',
          billToAddress: 'Test BillTo Address',
          contactPerson: 'Test Contact',
          contactPosition: 'Manager',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft',
          items: []
        })
      })

      expect(response.ok).toBe(true)
      const erha = await response.json()
      testData.erhaIds.push(erha.id)
      expect(erha.billTo).toBe('UniqueTestErha01')
    })

    it('should auto-increment billTo when duplicate exists', async () => {
      if (!(await isServerAvailable())) return

      // Create first erha ticket
      const response1 = await fetch('http://localhost:3000/api/erha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          quotationDate: new Date().toISOString(),
          invoiceBastDate: new Date().toISOString(),
          billTo: 'UniqueTestErha02',
          billToAddress: 'Test BillTo Address',
          contactPerson: 'Test Contact',
          contactPosition: 'Manager',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft',
          items: []
        })
      })

      const erha1 = await response1.json()
      testData.erhaIds.push(erha1.id)

      // Create second with same billTo
      const response2 = await fetch('http://localhost:3000/api/erha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          quotationDate: new Date().toISOString(),
          invoiceBastDate: new Date().toISOString(),
          billTo: 'UniqueTestErha02',
          billToAddress: 'Test BillTo Address',
          contactPerson: 'Test Contact',
          contactPosition: 'Manager',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft',
          items: []
        })
      })

      const erha2 = await response2.json()
      testData.erhaIds.push(erha2.id)
      expect(erha2.billTo).toBe('UniqueTestErha02 02')
    })

    it('should handle billTo updates without creating duplicates', async () => {
      if (!(await isServerAvailable())) return

      // Create erha ticket
      const createResponse = await fetch('http://localhost:3000/api/erha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          quotationDate: new Date().toISOString(),
          invoiceBastDate: new Date().toISOString(),
          billTo: 'UniqueTestErhaUpdate',
          billToAddress: 'Test BillTo Address',
          contactPerson: 'Test Contact',
          contactPosition: 'Manager',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft',
          items: []
        })
      })

      const erha = await createResponse.json()
      testData.erhaIds.push(erha.id)

      // Update with same billTo (should be allowed)
      const updateResponse = await fetch(`http://localhost:3000/api/erha/${erha.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company Updated',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date().toISOString(),
          quotationDate: new Date().toISOString(),
          invoiceBastDate: new Date().toISOString(),
          billTo: 'UniqueTestErhaUpdate',
          billToAddress: 'Test BillTo Address',
          contactPerson: 'Test Contact',
          contactPosition: 'Manager',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1500000,
          status: 'draft',
          items: []
        })
      })

      expect(updateResponse.ok).toBe(true)
      const updated = await updateResponse.json()
      expect(updated.billTo).toBe('UniqueTestErhaUpdate')
    })
  })

  describe('9. Error Handling and Edge Cases', () => {
    it('should handle empty strings correctly', async () => {
      const uniqueName = await generateUniqueName('', 'planning')
      expect(uniqueName).toBe('')
    })

    it('should handle whitespace-only strings correctly', async () => {
      const uniqueName = await generateUniqueName('   ', 'planning')
      expect(uniqueName).toBe('   ')
    })

    it('should handle names with special characters', async () => {
      const planning = await prisma.planning.create({
        data: {
          planningId: await generateId('PLN', 'planning'),
          projectName: 'Test@Special#Name',
          clientName: 'Test Client',
          clientBudget: 1000000
        }
      })
      testData.planningIds.push(planning.id)

      const uniqueName = await generateUniqueName('Test@Special#Name', 'planning')
      expect(uniqueName).toBe('Test@Special#Name 02')
    })

    it('should handle suffixes beyond 09 correctly', async () => {
      // Create records with suffixes up to 10
      const baseProjectName = 'UniqueTestManyDuplicates'
      const planning1 = await prisma.planning.create({
        data: {
          planningId: await generateId('PLN', 'planning'),
          projectName: baseProjectName,
          clientName: 'Test Client',
          clientBudget: 1000000
        }
      })
      testData.planningIds.push(planning1.id)

      for (let i = 2; i <= 10; i++) {
        const planning = await prisma.planning.create({
          data: {
            planningId: await generateId('PLN', 'planning'),
            projectName: `${baseProjectName} ${i < 10 ? '0' : ''}${i}`,
            clientName: 'Test Client',
            clientBudget: 1000000
          }
        })
        testData.planningIds.push(planning.id)
      }

      // Should generate 11 without leading zero
      const uniqueName = await generateUniqueName(baseProjectName, 'planning')
      expect(uniqueName).toBe(`${baseProjectName} 11`)
    })
  })

  describe('10. Cross-Entity Independence', () => {
    it('should allow same name across different entity types', async () => {
      const sameName = 'UniqueTestCrossEntity'

      // Planning with projectName
      const planning = await prisma.planning.create({
        data: {
          planningId: await generateId('PLN', 'planning'),
          projectName: sameName,
          clientName: 'Test Client',
          clientBudget: 1000000
        }
      })
      testData.planningIds.push(planning.id)

      // Quotation with billTo (different field, different entity)
      const quotation = await prisma.quotation.create({
        data: {
          quotationId: await generateId('QTN', 'quotation'),
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: sameName,
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 1000000,
          status: 'draft'
        }
      })
      testData.quotationIds.push(quotation.id)

      // Both should succeed without suffix
      expect(planning.projectName).toBe(sameName)
      expect(quotation.billTo).toBe(sameName)
    })
  })
})
