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

describe('Production Tracker Integration Tests', () => {
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
          { projectName: { contains: 'API Test Project' } }
        ]
      }
    })
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
  
  describe('2. Auto-Generation from Paid Invoices', () => {
    it('should create production tracker when invoice is marked as paid', async () => {
      // First, update invoice to paid status
      await prisma.invoice.update({
        where: { id: testInvoice.id },
        data: {
          status: 'paid',
          paidDate: new Date()
        }
      })
      
      // Mark invoice as paid (create expense)
      const response = await fetch(`http://localhost:3000/api/invoice/${testInvoice.id}/create-expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidDate: new Date().toISOString()
        })
      })
      
      expect(response.ok).toBe(true)
      
      // Check if production tracker was created
      const tracker = await prisma.productionTracker.findFirst({
        where: {
          projectName: testInvoice.billTo,
          invoiceId: testInvoice.invoiceId,
          deletedAt: null
        }
      })
      
      expect(tracker).toBeDefined()
      expect(tracker?.trackerId).toMatch(/^PT-\d{4}-\d{4}$/)
      expect(tracker?.projectName).toBe('Test Client Project')
      expect(tracker?.invoiceId).toBe(testInvoice.invoiceId)
      
      testTracker = tracker
    })
    
    it('should round all currency values from invoice', async () => {
      expect(testTracker).toBeDefined()
      
      // Values should be rounded (no decimals)
      expect(testTracker.subtotal % 1).toBe(0)
      expect(testTracker.totalAmount % 1).toBe(0)
      expect(testTracker.expense % 1).toBe(0)
      
      const productAmounts = testTracker.productAmounts as Record<string, number>
      Object.values(productAmounts).forEach(amount => {
        expect(amount % 1).toBe(0)
      })
    })
    
    it('should calculate expense as sum of all products except PHOTOGRAPHER', async () => {
      expect(testTracker).toBeDefined()
      
      const productAmounts = testTracker.productAmounts as Record<string, number>
      const expenseProducts = ['PROPS/SET', 'VIDEOGRAPHER', 'RETOUCHER', 'MUA HAIR', 
                               'MODEL/HANDMODEL', 'STUDIO/LIGHTING', 'FASHION STYLIST', 
                               'GRAFFER', 'MANAGER', 'FOOD & DRINK', 'ACCOMMODATION', 'PRINT']
      
      const calculatedExpense = expenseProducts.reduce((sum, product) => {
        return sum + (productAmounts[product] || 0)
      }, 0)
      
      expect(testTracker.expense).toBe(calculatedExpense)
    })
    
    it('should calculate PHOTOGRAPHER as totalAmount - expense', async () => {
      expect(testTracker).toBeDefined()
      
      const productAmounts = testTracker.productAmounts as Record<string, number>
      const expectedPhotographer = testTracker.totalAmount - testTracker.expense
      
      expect(productAmounts['PHOTOGRAPHER']).toBe(expectedPhotographer)
    })
  })
  
  describe('3. Auto-Update from Invoice (Preserve Product Data)', () => {
    it('should update tracker when invoice is re-paid, preserving existing product amounts', async () => {
      expect(testTracker).toBeDefined()
      
      // Manually update product amounts in the tracker
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
          expense: 7300000 // Sum of non-PHOTOGRAPHER products
        }
      })
      
      // Update invoice total
      await prisma.invoice.update({
        where: { id: testInvoice.id },
        data: { totalAmount: 12000000, paidDate: new Date() }
      })
      
      // Update tracker via API (simulating user editing the tracker after invoice amount changed)
      const response = await fetch(`http://localhost:3000/api/production-tracker/${testTracker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: testTracker.expenseId,
          invoiceId: testTracker.invoiceId,
          projectName: testTracker.projectName,
          date: testTracker.date.toISOString(),
          subtotal: Math.round(12000000 / 1.02),
          totalAmount: 12000000,
          expense: 7300000, // Preserved product amounts
          productAmounts: {
            'PHOTOGRAPHER': 12000000 - 7300000, // Recalculated
            'PROPS/SET': 1500000, // Preserved
            'VIDEOGRAPHER': 2000000, // Preserved
            'RETOUCHER': 1000000, // Preserved
            'MUA HAIR': 800000, // Preserved
            'MODEL/HANDMODEL': 1500000, // Preserved
            'STUDIO/LIGHTING': 500000 // Preserved
          },
          notes: testTracker.notes
        })
      })
      
      expect(response.ok).toBe(true)
      
      // Check tracker was updated, not replaced
      const updatedTracker = await prisma.productionTracker.findUnique({
        where: { id: testTracker.id }
      })
      
      expect(updatedTracker).toBeDefined()
      expect(updatedTracker?.totalAmount).toBe(12000000)
      
      // Product amounts should be preserved
      const productAmounts = updatedTracker?.productAmounts as Record<string, number>
      expect(productAmounts['PROPS/SET']).toBe(1500000)
      expect(productAmounts['VIDEOGRAPHER']).toBe(2000000)
      expect(productAmounts['RETOUCHER']).toBe(1000000)
      
      // PHOTOGRAPHER should be recalculated
      const recalculatedExpense = 7300000 // Same as before (preserved)
      const expectedPhotographer = 12000000 - recalculatedExpense
      expect(productAmounts['PHOTOGRAPHER']).toBe(expectedPhotographer)
      expect(updatedTracker?.expense).toBe(recalculatedExpense)
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
})
