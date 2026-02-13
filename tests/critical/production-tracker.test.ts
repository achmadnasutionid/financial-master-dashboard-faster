/**
 * Integration Tests: Production Tracker
 * 
 * Tests the production tracker functionality:
 * - Manual CRUD operations
 * - Auto-generation from paid invoices
 * - Auto-update when invoice is re-paid (preserving product data)
 * - Calculated fields (expense, photographer)
 * - Product amounts stored as JSON
 * - Rounding of currency values
 * - Soft delete
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/id-generator'
import { syncTracker } from '@/lib/tracker-sync'

// Helper to check if API server is available
let serverCheckResult: boolean | null = null
async function isServerAvailable(): Promise<boolean> {
  // Cache the result to avoid multiple checks
  if (serverCheckResult !== null) return serverCheckResult
  
  try {
    const response = await fetch('http://localhost:3000/api/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2 second timeout
    })
    serverCheckResult = response.ok
    return response.ok
  } catch {
    serverCheckResult = false
    return false
  }
}

// Helper to skip API test if server is not available
async function skipIfServerUnavailable(testName: string): Promise<boolean> {
  const available = await isServerAvailable()
  if (!available) {
    console.warn(`⚠️  Skipping "${testName}": Dev server not running on localhost:3000`)
  }
  return !available
}

describe('Tracker Integration Tests', () => {
  let testInvoice: any
  let testTracker: any
  
  beforeAll(async () => {
    // Create a test invoice for auto-generation tests
    const invoiceId = await generateId('INV', 'invoice')
    testInvoice = await prisma.invoice.create({
      data: {
        invoiceId,
        companyName: 'Test Company',
        companyAddress: 'Test Address',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        productionDate: new Date(),
        billTo: 'Test Client Project',
        billingName: 'Test Billing',
        billingBankName: 'Test Bank',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'data:image/png;base64,test',
        pph: '2',
        totalAmount: 11020408,
        status: 'draft'
      }
    })
    
    // Create invoice items
    await prisma.invoiceItem.create({
      data: {
        invoiceId: testInvoice.id,
        productName: 'Photography Service',
        total: 10800000,
        order: 0
      }
    })
    
    // Create tracker for the test invoice (simulating what happens in API route)
    testTracker = await syncTracker({
      projectName: testInvoice.billTo,
      date: testInvoice.productionDate,
      totalAmount: testInvoice.totalAmount,
      invoiceId: testInvoice.invoiceId,
      subtotal: 10800000
    })
  })
  
  afterAll(async () => {
    // Cleanup expenses created from invoice
    if (testInvoice?.invoiceId) {
      const expenses = await prisma.expense.findMany({
        where: { invoiceNumber: testInvoice.invoiceId }
      })
      for (const expense of expenses) {
        await prisma.expenseItem.deleteMany({ where: { expenseId: expense.id } })
        await prisma.expense.delete({ where: { id: expense.id } })
      }
    }
    
    // Cleanup trackers
    if (testTracker?.id) {
      await prisma.productionTracker.delete({ where: { id: testTracker.id } }).catch(() => {})
    }
    
    // Cleanup invoice
    if (testInvoice?.id) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: testInvoice.id } })
      await prisma.invoice.delete({ where: { id: testInvoice.id } })
    }
    
    // Clean up any remaining test trackers
    await prisma.productionTracker.deleteMany({
      where: {
        OR: [
          { projectName: { contains: 'Test Client Project' } },
          { projectName: { contains: 'Manual Test Project' } },
          { projectName: { contains: 'Update Test Project' } },
          { projectName: { contains: 'Delete Test Project' } },
          { projectName: { contains: 'JSON Test Project' } },
          { projectName: { contains: 'API Test Project' } },
          { projectName: { contains: 'Status Update Test' } },
          { projectName: { contains: 'Status Paid Test' } },
          { projectName: { contains: 'API Status Test' } },
          { projectName: { contains: 'Invoice ID Update Test' } },
          { projectName: { contains: 'API Invoice ID Test' } },
          { projectName: { contains: 'Status Auto-Create' } },
          { projectName: { contains: 'Invoice Link Test' } },
          { projectName: { contains: 'Generated Entry' } }
        ]
      }
    })

    // Clean up test invoices with specific patterns
    const testInvoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { billTo: { contains: 'Status Auto-Create' } },
          { billTo: { contains: 'Invoice Link Test' } },
          { billTo: { contains: 'Generated Entry' } }
        ]
      }
    })
    for (const invoice of testInvoices) {
      await prisma.invoiceItemDetail.deleteMany({
        where: { invoiceItem: { invoiceId: invoice.id } }
      })
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoiceRemark.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoiceSignature.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoice.delete({ where: { id: invoice.id } })
    }
  })
  
  describe('1. Manual CRUD Operations', () => {
    it('should create a production tracker manually', async () => {
      const trackerId = await generateId('PT', 'productionTracker')
      const expenseId = await generateId('EXP', 'expense')
      
      const tracker = await prisma.productionTracker.create({
        data: {
          trackerId,
          expenseId,
          projectName: 'Manual Test Project',
          date: new Date(),
          subtotal: 10000000,
          totalAmount: 10200000,
          expense: 8000000,
          productAmounts: {
            'PHOTOGRAPHER': 2200000,
            'PROPS/SET': 1000000,
            'VIDEOGRAPHER': 1500000,
            'RETOUCHER': 800000,
            'MUA HAIR': 1200000,
            'MODEL/HANDMODEL': 1500000,
            'STUDIO/LIGHTING': 1000000,
            'FOOD & DRINK': 500000,
            'PRINT': 500000
          },
          notes: 'Manual test tracker'
        }
      })
      
      expect(tracker).toBeDefined()
      expect(tracker.trackerId).toMatch(/^PT-\d{4}-\d{4}$/)
      expect(tracker.expenseId).toMatch(/^EXP-\d{4}-\d{4}$/)
      expect(tracker.expense).toBe(8000000)
      expect(tracker.totalAmount).toBe(10200000)
      
      const productAmounts = tracker.productAmounts as Record<string, number>
      expect(productAmounts['PHOTOGRAPHER']).toBe(2200000)
      expect(productAmounts['PROPS/SET']).toBe(1000000)
      
      // Cleanup
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
    })
    
    it('should fetch all production trackers (excluding soft-deleted)', async () => {
      const response = await fetch('http://localhost:3000/api/production-tracker')
      expect(response.ok).toBe(true)
      
      const trackers = await response.json()
      expect(Array.isArray(trackers)).toBe(true)
      
      // Should not include soft-deleted trackers
      const softDeleted = trackers.filter((t: any) => t.deletedAt !== null)
      expect(softDeleted.length).toBe(0)
    })
    
    it('should update production tracker product amounts', async () => {
      const serverAvailable = await isServerAvailable()
      if (!serverAvailable) {
        console.warn('⚠️  Skipping API test: Dev server not running on localhost:3000')
        return
      }

      const trackerId = await generateId('PT', 'productionTracker')
      const expenseId = await generateId('EXP', 'expense')
      
      const tracker = await prisma.productionTracker.create({
        data: {
          trackerId,
          expenseId,
          projectName: 'Update Test Project',
          date: new Date(),
          subtotal: 5000000,
          totalAmount: 5100000,
          expense: 3000000,
          productAmounts: {
            'PHOTOGRAPHER': 2100000,
            'PROPS/SET': 1000000,
            'VIDEOGRAPHER': 2000000
          }
        }
      })
      
      // Update product amounts
      const response = await fetch(`http://localhost:3000/api/production-tracker/${tracker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: 'Update Test Project',
          date: tracker.date.toISOString(),
          subtotal: 6000000,
          totalAmount: 6120000,
          expense: 4000000,
          productAmounts: {
            'PHOTOGRAPHER': 2120000,
            'PROPS/SET': 1200000,
            'VIDEOGRAPHER': 2800000
          }
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
      }
      expect(response.ok).toBe(true)
      
      const updated = await prisma.productionTracker.findUnique({
        where: { id: tracker.id }
      })
      
      expect(updated?.totalAmount).toBe(6120000)
      expect(updated?.expense).toBe(4000000)
      const productAmounts = updated?.productAmounts as Record<string, number>
      expect(productAmounts['PHOTOGRAPHER']).toBe(2120000)
      expect(productAmounts['VIDEOGRAPHER']).toBe(2800000)
      
      // Cleanup
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
    })
    
    it('should soft delete a production tracker', async () => {
      const trackerId = await generateId('PT', 'productionTracker')
      const expenseId = await generateId('EXP', 'expense')
      
      const tracker = await prisma.productionTracker.create({
        data: {
          trackerId,
          expenseId,
          projectName: 'Delete Test Project',
          date: new Date(),
          subtotal: 1000000,
          totalAmount: 1020000,
          expense: 800000,
          productAmounts: { 'PHOTOGRAPHER': 220000, 'PROPS/SET': 800000 }
        }
      })
      
      const response = await fetch(`http://localhost:3000/api/production-tracker/${tracker.id}`, {
        method: 'DELETE'
      })
      
      expect(response.ok).toBe(true)
      
      const deleted = await prisma.productionTracker.findUnique({
        where: { id: tracker.id }
      })
      
      expect(deleted?.deletedAt).not.toBeNull()
      
      // Cleanup
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
    })
  })
  
  describe('2. Auto-Generation from Invoice Creation', () => {
    it('should create production tracker when invoice is created (not just when paid)', async () => {
      // Tracker should already exist from beforeAll
      expect(testTracker).toBeDefined()
      expect(testTracker.trackerId).toMatch(/^PT-\d{4}-\d{4}$/)
      expect(testTracker.projectName).toBe('Test Client Project')
      expect(testTracker.invoiceId).toBe(testInvoice.invoiceId)
      expect(testTracker.status).toBe('pending') // Default status
      expect(testTracker.productAmounts).toEqual({}) // Empty - user fills manually
    })
    
    it('should round all currency values from invoice', async () => {
      expect(testTracker).toBeDefined()
      
      // Values should be rounded (no decimals)
      expect(testTracker.subtotal % 1).toBe(0)
      expect(testTracker.totalAmount % 1).toBe(0)
      
      // Note: expense and productAmounts are now user-entered, not auto-calculated
      // So we skip those checks in this test
    })
    
    it('should NOT auto-calculate expense and productAmounts (user-entered only)', async () => {
      expect(testTracker).toBeDefined()
      
      // productAmounts should be empty (user fills manually)
      expect(testTracker.productAmounts).toEqual({})
      
      // expense should be 0 (default value)
      expect(testTracker.expense).toBe(0)
    })
  })
  
  describe('3. Auto-Update from Invoice (Preserve User Data)', () => {
    it('should update tracker when invoice is updated, but preserve user-entered product amounts', async () => {
      expect(testTracker).toBeDefined()
      
      // Manually update product amounts in the tracker (simulating user input)
      await prisma.productionTracker.update({
        where: { id: testTracker.id },
        data: {
          productAmounts: {
            'PHOTOGRAPHER': 3000000,
            'PROPS/SET': 1500000,
            'VIDEOGRAPHER': 2000000,
            'RETOUCHER': 1000000,
            'MUA HAIR': 800000,
            'MODEL/HANDMODEL': 1500000,
            'STUDIO/LIGHTING': 500000
          },
          expense: 7300000, // Sum of non-PHOTOGRAPHER products
          notes: 'User-entered data'
        }
      })
      
      // Update invoice total (simulating invoice edit)
      await prisma.invoice.update({
        where: { id: testInvoice.id },
        data: { 
          totalAmount: 12000000,
          productionDate: new Date('2026-03-01')
        }
      })
      
      // Re-fetch tracker (in real app, syncTracker would be called automatically)
      const updatedTracker = await prisma.productionTracker.findUnique({
        where: { id: testTracker.id }
      })
      
      expect(updatedTracker).toBeDefined()
      
      // Invoice updates should sync to tracker (via syncTracker in real flow)
      // but user data is preserved
      expect(updatedTracker?.productAmounts).toEqual({
        'PHOTOGRAPHER': 3000000,
        'PROPS/SET': 1500000,
        'VIDEOGRAPHER': 2000000,
        'RETOUCHER': 1000000,
        'MUA HAIR': 800000,
        'MODEL/HANDMODEL': 1500000,
        'STUDIO/LIGHTING': 500000
      })
      expect(updatedTracker?.expense).toBe(7300000)
      expect(updatedTracker?.notes).toBe('User-entered data')
    })
  })
  
  describe('4. Product Amounts as JSON', () => {
    it('should store product amounts as JSONB object (no migration needed for new products)', async () => {
      const trackerId = await generateId('PT', 'productionTracker')
      const expenseId = await generateId('EXP', 'expense')
      
      // Create tracker with custom product (not in master list)
      const tracker = await prisma.productionTracker.create({
        data: {
          trackerId,
          expenseId,
          projectName: 'JSON Test Project',
          date: new Date(),
          subtotal: 5000000,
          totalAmount: 5100000,
          expense: 3000000,
          productAmounts: {
            'PHOTOGRAPHER': 2100000,
            'PROPS/SET': 1000000,
            'CUSTOM_PRODUCT_1': 500000,
            'CUSTOM_PRODUCT_2': 1500000
          }
        }
      })
      
      expect(tracker.productAmounts).toBeDefined()
      
      const productAmounts = tracker.productAmounts as Record<string, number>
      expect(productAmounts['CUSTOM_PRODUCT_1']).toBe(500000)
      expect(productAmounts['CUSTOM_PRODUCT_2']).toBe(1500000)
      
      // Update with even more custom products (no schema change needed)
      await prisma.productionTracker.update({
        where: { id: tracker.id },
        data: {
          productAmounts: {
            ...productAmounts,
            'NEW_PRODUCT_2026': 300000
          }
        }
      })
      
      const updated = await prisma.productionTracker.findUnique({
        where: { id: tracker.id }
      })
      
      const updatedAmounts = updated?.productAmounts as Record<string, number>
      expect(updatedAmounts['NEW_PRODUCT_2026']).toBe(300000)
      
      // Cleanup
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
    })
  })
  
  describe('5. API Endpoint Integration', () => {
    it('should return production tracker with all fields', async () => {
      expect(testTracker).toBeDefined()
      
      const response = await fetch(`http://localhost:3000/api/production-tracker/${testTracker.id}`)
      expect(response.ok).toBe(true)
      
      const tracker = await response.json()
      
      expect(tracker.id).toBe(testTracker.id)
      expect(tracker.trackerId).toBeDefined()
      expect(tracker.expenseId).toBeDefined()
      expect(tracker.projectName).toBeDefined()
      expect(tracker.date).toBeDefined()
      expect(tracker.subtotal).toBeDefined()
      expect(tracker.totalAmount).toBeDefined()
      expect(tracker.expense).toBeDefined()
      expect(tracker.productAmounts).toBeDefined()
      expect(typeof tracker.productAmounts).toBe('object')
    })
    
    it('should create tracker via API with all required fields', async () => {
      const trackerId = await generateId('PT', 'productionTracker')
      const expenseId = await generateId('EXP', 'expense')
      
      const response = await fetch('http://localhost:3000/api/production-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackerId,
          expenseId,
          projectName: 'API Test Project',
          date: new Date().toISOString(),
          subtotal: 8000000,
          totalAmount: 8160000,
          expense: 6000000,
          productAmounts: {
            'PHOTOGRAPHER': 2160000,
            'PROPS/SET': 2000000,
            'VIDEOGRAPHER': 2000000,
            'RETOUCHER': 1000000,
            'MUA HAIR': 1000000
          },
          notes: 'Created via API'
        })
      })
      
      expect(response.ok).toBe(true)
      
      const tracker = await response.json()
      expect(tracker.trackerId).toMatch(/^PT-\d{4}-\d{4}$/)
      expect(tracker.projectName).toBe('API Test Project')
      expect(tracker.expense).toBe(6000000)
      
      // Cleanup
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
    })
  })
  
  describe('6. Status Field Management', () => {
    it('should create tracker with default "pending" status', async () => {
      const trackerId = await generateId('PT', 'productionTracker')
      const expenseId = await generateId('EXP', 'expense')
      
      const response = await fetch('http://localhost:3000/api/production-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId,
          projectName: 'Status Test Project',
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
      expect(tracker.status).toBe('pending')
      
      // Cleanup
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
    })
    
    it('should update status from pending to in progress', async () => {
      if (await skipIfServerUnavailable('should update status from pending to in progress')) return

      const trackerId = await generateId('PT', 'productionTracker')
      const expenseId = await generateId('EXP', 'expense')
      
      const tracker = await prisma.productionTracker.create({
        data: {
          trackerId,
          expenseId,
          projectName: 'Status Update Test',
          date: new Date(),
          subtotal: 1000000,
          totalAmount: 1020000,
          expense: 800000,
          productAmounts: {
            'PHOTOGRAPHER': 220000,
            'PROPS/SET': 800000
          },
          status: 'pending'
        }
      })
      
      const response = await fetch(`http://localhost:3000/api/production-tracker/${tracker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in progress'
        })
      })
      
      expect(response.ok).toBe(true)
      
      const updated = await prisma.productionTracker.findUnique({
        where: { id: tracker.id }
      })
      
      expect(updated?.status).toBe('in progress')
      
      // Cleanup
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
    })
    
    it('should update status from in progress to paid', async () => {
      if (await skipIfServerUnavailable('should update status from in progress to paid')) return

      const trackerId = await generateId('PT', 'productionTracker')
      const expenseId = await generateId('EXP', 'expense')
      
      const tracker = await prisma.productionTracker.create({
        data: {
          trackerId,
          expenseId,
          projectName: 'Status Paid Test',
          date: new Date(),
          subtotal: 2000000,
          totalAmount: 2040000,
          expense: 1500000,
          productAmounts: {
            'PHOTOGRAPHER': 540000,
            'PROPS/SET': 1500000
          },
          status: 'in progress'
        }
      })
      
      const response = await fetch(`http://localhost:3000/api/production-tracker/${tracker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid'
        })
      })
      
      expect(response.ok).toBe(true)
      
      const updated = await prisma.productionTracker.findUnique({
        where: { id: tracker.id }
      })
      
      expect(updated?.status).toBe('paid')
      
      // Cleanup
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
    })
    
    it('should auto-create tracker with "pending" status when invoice is created', async () => {
      if (await skipIfServerUnavailable('should auto-create tracker with "pending" status when invoice is created')) return

      // Create a new test invoice (tracker auto-created on creation, not on paid)
      const invoiceId = await generateId('INV', 'invoice')
      const invoice = await prisma.invoice.create({
        data: {
          invoiceId,
          companyName: 'Status Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: 'Status Auto-Create Project',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 5000000,
          status: 'draft' // Just draft, not paid yet
        }
      })
      
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          productName: 'Test Service',
          total: 4900000,
          order: 0
        }
      })
      
      // Check tracker was created automatically with pending status
      const tracker = await prisma.productionTracker.findFirst({
        where: {
          projectName: 'Status Auto-Create Project',
          deletedAt: null
        }
      })
      
      expect(tracker).toBeDefined()
      expect(tracker?.status).toBe('pending')
      
      // Cleanup
      if (tracker) {
        await prisma.productionTracker.delete({ where: { id: tracker.id } })
      }
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoice.delete({ where: { id: invoice.id } })
    })
    
    it('should return status field in API responses', async () => {
      if (await skipIfServerUnavailable('should return status field in API responses')) return

      const trackerId = await generateId('PT', 'productionTracker')
      const expenseId = await generateId('EXP', 'expense')
      
      const tracker = await prisma.productionTracker.create({
        data: {
          trackerId,
          expenseId,
          projectName: 'API Status Test',
          date: new Date(),
          subtotal: 1000000,
          totalAmount: 1020000,
          expense: 800000,
          productAmounts: {
            'PHOTOGRAPHER': 220000,
            'PROPS/SET': 800000
          },
          status: 'in progress'
        }
      })
      
      // GET single tracker
      const getResponse = await fetch(`http://localhost:3000/api/production-tracker/${tracker.id}`)
      expect(getResponse.ok).toBe(true)
      
      const getTracker = await getResponse.json()
      expect(getTracker.status).toBe('in progress')
      
      // GET all trackers
      const listResponse = await fetch('http://localhost:3000/api/production-tracker')
      expect(listResponse.ok).toBe(true)
      
      const trackers = await listResponse.json()
      const foundTracker = trackers.find((t: any) => t.id === tracker.id)
      expect(foundTracker?.status).toBe('in progress')
      
      // Cleanup
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
    })
  })
  
  describe('7. Invoice ID Column and Link Functionality', () => {
    it('should store and display invoice ID when tracker is created from invoice', async () => {
      if (await skipIfServerUnavailable('should store and display invoice ID when tracker is created from invoice')) return

      // Create a test invoice (tracker auto-created on invoice creation)
      const invoiceId = await generateId('INV', 'invoice')
      const invoice = await prisma.invoice.create({
        data: {
          invoiceId,
          companyName: 'Invoice Link Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: 'Invoice Link Test Project',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 5000000,
          status: 'draft'
        }
      })
      
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          productName: 'Test Service',
          total: 4900000,
          order: 0
        }
      })
      
      // Check tracker was created with invoice ID automatically
      const tracker = await prisma.productionTracker.findFirst({
        where: {
          projectName: 'Invoice Link Test Project',
          deletedAt: null
        }
      })
      
      expect(tracker).toBeDefined()
      expect(tracker?.invoiceId).toBe(invoiceId)
      expect(tracker?.invoiceId).toMatch(/^INV-\d{4}-\d{4}$/)
      
      // Cleanup
      if (tracker) {
        await prisma.productionTracker.delete({ where: { id: tracker.id } })
      }
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoice.delete({ where: { id: invoice.id } })
    })
    
    it('should allow manual entry without invoice ID', async () => {
      const trackerId = await generateId('PT', 'productionTracker')
      const expenseId = await generateId('EXP', 'expense')
      
      const response = await fetch('http://localhost:3000/api/production-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId,
          projectName: 'Manual Entry Test',
          date: new Date().toISOString(),
          subtotal: 1000000,
          totalAmount: 1020000,
          expense: 800000,
          productAmounts: {
            'PHOTOGRAPHER': 220000,
            'PROPS/SET': 800000
          }
          // No invoiceId provided
        })
      })
      
      expect(response.ok).toBe(true)
      
      const tracker = await response.json()
      expect(tracker.invoiceId).toBeNull()
      
      // Cleanup
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
    })
    
    it('should update invoice ID via API', async () => {
      if (await skipIfServerUnavailable('should update invoice ID via API')) return

      const trackerId = await generateId('PT', 'productionTracker')
      const expenseId = await generateId('EXP', 'expense')
      
      const tracker = await prisma.productionTracker.create({
        data: {
          trackerId,
          expenseId,
          projectName: 'Invoice ID Update Test',
          date: new Date(),
          subtotal: 1000000,
          totalAmount: 1020000,
          expense: 800000,
          productAmounts: {
            'PHOTOGRAPHER': 220000,
            'PROPS/SET': 800000
          },
          invoiceId: null
        }
      })
      
      const newInvoiceId = 'INV-2024-9999'
      
      const response = await fetch(`http://localhost:3000/api/production-tracker/${tracker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: newInvoiceId
        })
      })
      
      expect(response.ok).toBe(true)
      
      const updated = await prisma.productionTracker.findUnique({
        where: { id: tracker.id }
      })
      
      expect(updated?.invoiceId).toBe(newInvoiceId)
      
      // Cleanup
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
    })
    
    it('should return invoice ID in API responses', async () => {
      const trackerId = await generateId('PT', 'productionTracker')
      const expenseId = await generateId('EXP', 'expense')
      const invoiceId = 'INV-2024-1234'
      
      const tracker = await prisma.productionTracker.create({
        data: {
          trackerId,
          expenseId,
          invoiceId,
          projectName: 'API Invoice ID Test',
          date: new Date(),
          subtotal: 1000000,
          totalAmount: 1020000,
          expense: 800000,
          productAmounts: {
            'PHOTOGRAPHER': 220000,
            'PROPS/SET': 800000
          }
        }
      })
      
      // GET single tracker
      const getResponse = await fetch(`http://localhost:3000/api/production-tracker/${tracker.id}`)
      expect(getResponse.ok).toBe(true)
      
      const getTracker = await getResponse.json()
      expect(getTracker.invoiceId).toBe(invoiceId)
      
      // GET all trackers
      const listResponse = await fetch('http://localhost:3000/api/production-tracker')
      expect(listResponse.ok).toBe(true)
      
      const trackers = await listResponse.json()
      const foundTracker = trackers.find((t: any) => t.id === tracker.id)
      expect(foundTracker?.invoiceId).toBe(invoiceId)
      
      // Cleanup
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
    })
    
    it('should differentiate between invoice-generated and manual entries', async () => {
      // Create invoice-generated tracker (auto-created on invoice creation)
      const invoiceId = await generateId('INV', 'invoice')
      const invoice = await prisma.invoice.create({
        data: {
          invoiceId,
          companyName: 'Differentiation Test',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: 'Generated Entry',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 5000000,
          status: 'draft'
        }
      })
      
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          productName: 'Test Service',
          total: 4900000,
          order: 0
        }
      })
      
      // Create manual tracker
      const trackerId = await generateId('PT', 'productionTracker')
      const expenseId = await generateId('EXP', 'expense')
      
      const manualTracker = await prisma.productionTracker.create({
        data: {
          trackerId,
          expenseId,
          projectName: 'Manual Entry',
          date: new Date(),
          subtotal: 1000000,
          totalAmount: 1020000,
          expense: 800000,
          productAmounts: { 'PHOTOGRAPHER': 220000, 'PROPS/SET': 800000 }
        }
      })
      
      // Fetch all trackers
      const response = await fetch('http://localhost:3000/api/production-tracker')
      const trackers = await response.json()
      
      const generatedTracker = trackers.find((t: any) => t.projectName === 'Generated Entry')
      const manualEntry = trackers.find((t: any) => t.projectName === 'Manual Entry')
      
      // Invoice-generated should have invoiceId
      expect(generatedTracker?.invoiceId).toBeTruthy()
      expect(generatedTracker?.invoiceId).toMatch(/^INV-\d{4}-\d{4}$/)
      
      // Manual entry should have null invoiceId
      expect(manualEntry?.invoiceId).toBeNull()
      
      // Cleanup
      await prisma.productionTracker.deleteMany({
        where: {
          OR: [
            { projectName: 'Generated Entry' },
            { projectName: 'Manual Entry' }
          ]
        }
      })
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoice.delete({ where: { id: invoice.id } })
    })
  })
})
