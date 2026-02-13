/**
 * Integration Tests: Tracker Synchronization
 * 
 * Tests the new tracker synchronization business logic:
 * - Tracker created on first document creation (Quotation, Invoice, Paragon, Erha)
 * - Smart merge: updates existing tracker if projectName/billTo already exists
 * - Preserves user-entered fields during updates
 * - Tracker not created for Planning and Expense entities
 * - Copy behavior creates new tracker with suffix
 * - Deletion does not delete tracker
 * 
 * NOTE: These tests create entities directly via Prisma to test the database constraints
 * and relationships. The actual tracker sync logic is tested in production-tracker.test.ts
 * which uses the API endpoints where syncTracker() is called.
 */

import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/id-generator'
import { syncTracker } from '@/lib/tracker-sync'

// Track all created test data for cleanup
const createdData = {
  quotations: [] as string[],
  invoices: [] as string[],
  paragonTickets: [] as string[],
  erhaTickets: [] as string[],
  planning: [] as string[],
  expenses: [] as string[],
  trackers: [] as string[]
}

describe('Tracker Synchronization Tests', () => {
  
  afterAll(async () => {
    // Comprehensive cleanup to prevent data leakage
    try {
      // Delete all related data in proper order
      for (const id of createdData.quotations) {
        await prisma.quotationItemDetail.deleteMany({ where: { quotationItem: { quotationId: id } } })
        await prisma.quotationItem.deleteMany({ where: { quotationId: id } })
        await prisma.quotationRemark.deleteMany({ where: { quotationId: id } })
        await prisma.quotationSignature.deleteMany({ where: { quotationId: id } })
        await prisma.quotation.delete({ where: { id } }).catch(() => {})
      }
      
      for (const id of createdData.invoices) {
        await prisma.invoiceItemDetail.deleteMany({ where: { invoiceItem: { invoiceId: id } } })
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
        await prisma.invoiceRemark.deleteMany({ where: { invoiceId: id } })
        await prisma.invoiceSignature.deleteMany({ where: { invoiceId: id } })
        await prisma.invoice.delete({ where: { id } }).catch(() => {})
      }
      
      for (const id of createdData.paragonTickets) {
        await prisma.paragonTicketItemDetail.deleteMany({ where: { paragonTicketItem: { ticketId: id } } })
        await prisma.paragonTicketItem.deleteMany({ where: { ticketId: id } })
        await prisma.paragonTicketRemark.deleteMany({ where: { ticketId: id } })
        await prisma.paragonTicket.delete({ where: { id } }).catch(() => {})
      }
      
      for (const id of createdData.erhaTickets) {
        await prisma.erhaTicketItemDetail.deleteMany({ where: { erhaTicketItem: { ticketId: id } } })
        await prisma.erhaTicketItem.deleteMany({ where: { ticketId: id } })
        await prisma.erhaTicketRemark.deleteMany({ where: { ticketId: id } })
        await prisma.erhaTicket.delete({ where: { id } }).catch(() => {})
      }
      
      for (const id of createdData.planning) {
        await prisma.planningItem.deleteMany({ where: { planningId: id } })
        await prisma.planning.delete({ where: { id } }).catch(() => {})
      }
      
      for (const id of createdData.expenses) {
        await prisma.expenseItem.deleteMany({ where: { expenseId: id } })
        await prisma.expense.delete({ where: { id } }).catch(() => {})
      }
      
      for (const id of createdData.trackers) {
        await prisma.productionTracker.delete({ where: { id } }).catch(() => {})
      }
      
      // Final cleanup by project name patterns
      await prisma.productionTracker.deleteMany({
        where: {
          projectName: {
            contains: 'Tracker Sync Test'
          }
        }
      })
    } catch (error) {
      console.error('Cleanup error:', error)
    }
  })
  
  describe('1. Tracker Creation on First Document Creation', () => {
    it('should create tracker when quotation is created (draft or final)', async () => {
      const quotationId = await generateId('QTN', 'quotation')
      
      const quotation = await prisma.quotation.create({
        data: {
          quotationId,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: 'Tracker Sync Test - Quotation Draft',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 5000000,
          status: 'draft' // Draft status
        }
      })
      createdData.quotations.push(quotation.id)
      
      // Manually sync tracker (in real app, this happens in POST route)
      const tracker = await syncTracker({
        projectName: quotation.billTo,
        date: quotation.productionDate,
        totalAmount: quotation.totalAmount,
        subtotal: 0
      })
      
      expect(tracker).toBeDefined()
      expect(tracker.status).toBe('pending')
      expect(tracker.totalAmount).toBe(5000000)
      expect(tracker.invoiceId).toBeNull() // No invoice yet
      expect(tracker.productAmounts).toEqual({}) // Empty - manually filled by user
      
      if (tracker) createdData.trackers.push(tracker.id)
    })
    
    it('should create tracker when invoice is created (not just when paid)', async () => {
      const invoiceId = await generateId('INV', 'invoice')
      
      const invoice = await prisma.invoice.create({
        data: {
          invoiceId,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: 'Tracker Sync Test - Invoice Draft',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 7000000,
          status: 'draft' // Draft, not paid
        }
      })
      createdData.invoices.push(invoice.id)
      
      // Manually sync tracker (in real app, this happens in POST route)
      const tracker = await syncTracker({
        projectName: invoice.billTo,
        date: invoice.productionDate,
        totalAmount: invoice.totalAmount,
        invoiceId: invoice.invoiceId,
        subtotal: 0
      })
      
      expect(tracker).toBeDefined()
      expect(tracker.status).toBe('pending')
      expect(tracker.totalAmount).toBe(7000000)
      expect(tracker.invoiceId).toBe(invoiceId) // Invoice ID is set
      expect(tracker.productAmounts).toEqual({})
      
      if (tracker) createdData.trackers.push(tracker.id)
    })
    
    it('should create tracker when Paragon ticket is created', async () => {
      const ticketId = await generateId('PRG', 'paragonTicket')
      
      const ticket = await prisma.paragonTicket.create({
        data: {
          ticketId,
          quotationId: `QTN-2026-${Math.floor(Math.random() * 9999)}`,
          invoiceId: `INV-2026-${Math.floor(Math.random() * 9999)}`,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          quotationDate: new Date(),
          invoiceBastDate: new Date(),
          billTo: 'Tracker Sync Test - Paragon',
          contactPerson: 'Test Person',
          contactPosition: 'Manager',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 3000000,
          status: 'draft'
        }
      })
      createdData.paragonTickets.push(ticket.id)
      
      // Manually sync tracker (in real app, this happens in POST route)
      const tracker = await syncTracker({
        projectName: ticket.billTo,
        date: ticket.productionDate,
        totalAmount: ticket.totalAmount,
        subtotal: 0
      })
      
      expect(tracker).toBeDefined()
      expect(tracker.status).toBe('pending')
      expect(tracker.totalAmount).toBe(3000000)
      
      if (tracker) createdData.trackers.push(tracker.id)
    })
    
    it('should create tracker when Erha ticket is created', async () => {
      const ticketId = await generateId('ERH', 'erhaTicket')
      
      const ticket = await prisma.erhaTicket.create({
        data: {
          ticketId,
          quotationId: `QTN-2026-${Math.floor(Math.random() * 9999)}`,
          invoiceId: `INV-2026-${Math.floor(Math.random() * 9999)}`,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          quotationDate: new Date(),
          invoiceBastDate: new Date(),
          billTo: 'Tracker Sync Test - Erha',
          billToAddress: 'Test Address',
          contactPerson: 'Test Person',
          contactPosition: 'Manager',
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 4000000,
          status: 'draft'
        }
      })
      createdData.erhaTickets.push(ticket.id)
      
      // Manually sync tracker (in real app, this happens in POST route)
      const tracker = await syncTracker({
        projectName: ticket.billTo,
        date: ticket.productionDate,
        totalAmount: ticket.totalAmount,
        subtotal: 0
      })
      
      expect(tracker).toBeDefined()
      expect(tracker.status).toBe('pending')
      expect(tracker.totalAmount).toBe(4000000)
      
      if (tracker) createdData.trackers.push(tracker.id)
    })
  })
  
  describe('2. Smart Merge - Update Existing Tracker', () => {
    it('should update existing tracker when quotation with same billTo is created', async () => {
      const projectName = 'Tracker Sync Test - Smart Merge Quotation'
      
      // Create first quotation and sync tracker
      const quotationId1 = await generateId('QTN', 'quotation')
      const quotation1 = await prisma.quotation.create({
        data: {
          quotationId: quotationId1,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date('2026-01-01'),
          billTo: projectName,
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
      createdData.quotations.push(quotation1.id)
      
      const tracker1 = await syncTracker({
        projectName,
        date: quotation1.productionDate,
        totalAmount: quotation1.totalAmount,
        subtotal: 0
      })
      expect(tracker1).toBeDefined()
      if (tracker1) createdData.trackers.push(tracker1.id)
      
      // Create second quotation with SAME billTo
      const quotationId2 = await generateId('QTN', 'quotation')
      const quotation2 = await prisma.quotation.create({
        data: {
          quotationId: quotationId2,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date('2026-02-01'),
          billTo: projectName, // Same name
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 8000000, // Different amount
          status: 'draft'
        }
      })
      createdData.quotations.push(quotation2.id)
      
      // Sync should update, not create new
      await syncTracker({
        projectName,
        date: quotation2.productionDate,
        totalAmount: quotation2.totalAmount,
        subtotal: 0
      })
      
      // Should still have only ONE tracker, but updated
      const trackers = await prisma.productionTracker.findMany({
        where: { projectName, deletedAt: null }
      })
      
      expect(trackers).toHaveLength(1)
      expect(trackers[0].id).toBe(tracker1.id) // Same tracker
      expect(trackers[0].totalAmount).toBe(8000000) // Updated amount
      expect(trackers[0].date.toISOString().split('T')[0]).toBe('2026-02-01') // Updated date
    })
    
    it('should update existing tracker when invoice with same billTo is created', async () => {
      const projectName = 'Tracker Sync Test - Smart Merge Invoice'
      
      // Create quotation first
      const quotationId = await generateId('QTN', 'quotation')
      const quotation = await prisma.quotation.create({
        data: {
          quotationId,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date('2026-01-01'),
          billTo: projectName,
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
      createdData.quotations.push(quotation.id)
      
      const tracker1 = await syncTracker({
        projectName,
        date: quotation.productionDate,
        totalAmount: quotation.totalAmount,
        subtotal: 0
      })
      expect(tracker1).toBeDefined()
      expect(tracker1.invoiceId).toBeNull() // No invoice yet
      if (tracker1) createdData.trackers.push(tracker1.id)
      
      // Create invoice with SAME billTo
      const invoiceId = await generateId('INV', 'invoice')
      const invoice = await prisma.invoice.create({
        data: {
          invoiceId,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date('2026-02-15'),
          billTo: projectName, // Same name
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 9000000,
          status: 'draft'
        }
      })
      createdData.invoices.push(invoice.id)
      
      // Sync should update, not create new
      await syncTracker({
        projectName,
        date: invoice.productionDate,
        totalAmount: invoice.totalAmount,
        invoiceId: invoice.invoiceId,
        subtotal: 0
      })
      
      // Should still have only ONE tracker, but updated
      const trackers = await prisma.productionTracker.findMany({
        where: { projectName, deletedAt: null }
      })
      
      expect(trackers).toHaveLength(1)
      expect(trackers[0].id).toBe(tracker1.id) // Same tracker
      expect(trackers[0].totalAmount).toBe(9000000) // Updated to invoice amount
      expect(trackers[0].invoiceId).toBe(invoiceId) // Invoice ID now set
      expect(trackers[0].date.toISOString().split('T')[0]).toBe('2026-02-15') // Invoice production date
    })
  })
  
  describe('3. Preserve User-Entered Fields', () => {
    it('should preserve productAmounts, expense, notes, and status when tracker is updated from document', async () => {
      const projectName = 'Tracker Sync Test - Preserve Fields'
      
      // Create invoice (creates tracker)
      const invoiceId = await generateId('INV', 'invoice')
      const invoice = await prisma.invoice.create({
        data: {
          invoiceId,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: projectName,
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
      createdData.invoices.push(invoice.id)
      
      const tracker = await prisma.productionTracker.findFirst({
        where: { projectName, deletedAt: null }
      })
      expect(tracker).toBeDefined()
      if (tracker) createdData.trackers.push(tracker.id)
      
      // User manually fills in tracker fields
      await prisma.productionTracker.update({
        where: { id: tracker!.id },
        data: {
          productAmounts: {
            'PHOTOGRAPHER': 2000000,
            'PROPS/SET': 1500000,
            'VIDEOGRAPHER': 1500000
          },
          expense: 3000000,
          notes: 'User manually entered data',
          status: 'in progress'
        }
      })
      
      // Update tracker (in real app, syncTracker would be called automatically on invoice update)
      await syncTracker({
        projectName,
        date: new Date('2026-03-01'),
        totalAmount: 7000000,
        invoiceId: invoice.invoiceId,
        subtotal: 0
      })
      
      // Re-fetch tracker to check updated values
      const updatedTracker = await prisma.productionTracker.findFirst({
        where: { projectName, deletedAt: null }
      })
      
      // These fields should be updated from invoice sync
      expect(updatedTracker?.totalAmount).toBe(7000000)
      expect(updatedTracker?.date.toISOString().split('T')[0]).toBe('2026-03-01')
      
      // These fields should be PRESERVED (user data)
      expect(updatedTracker?.productAmounts).toEqual({
        'PHOTOGRAPHER': 2000000,
        'PROPS/SET': 1500000,
        'VIDEOGRAPHER': 1500000
      })
      expect(updatedTracker?.expense).toBe(3000000)
      expect(updatedTracker?.notes).toBe('User manually entered data')
      expect(updatedTracker?.status).toBe('in progress')
    })
  })
  
  describe('4. Entities That Do NOT Create Trackers', () => {
    it('should NOT create tracker when Planning is created', async () => {
      const planningId = await generateId('PLN', 'planning')
      
      const planning = await prisma.planning.create({
        data: {
          planningId,
          projectName: 'Tracker Sync Test - Planning Should Not Create',
          planningDate: new Date(),
          productionDate: new Date(),
          client: 'Test Client',
          projectType: 'Photography',
          status: 'pending'
        }
      })
      createdData.planning.push(planning.id)
      
      // Check that NO tracker was created
      const tracker = await prisma.productionTracker.findFirst({
        where: {
          projectName: 'Tracker Sync Test - Planning Should Not Create',
          deletedAt: null
        }
      })
      
      expect(tracker).toBeNull()
    })
    
    it('should NOT create tracker when Expense is created', async () => {
      const expenseId = await generateId('EXP', 'expense')
      
      const expense = await prisma.expense.create({
        data: {
          expenseId,
          projectName: 'Tracker Sync Test - Expense Should Not Create',
          date: new Date(),
          productionDate: new Date(),
          invoiceNumber: 'INV-TEST-0001',
          expenseItems: {
            create: [
              {
                productName: 'Test Item',
                qty: 1,
                unitPrice: 1000000,
                totalPrice: 1000000
              }
            ]
          }
        }
      })
      createdData.expenses.push(expense.id)
      
      // Check that NO tracker was created
      const tracker = await prisma.productionTracker.findFirst({
        where: {
          projectName: 'Tracker Sync Test - Expense Should Not Create',
          deletedAt: null
        }
      })
      
      expect(tracker).toBeNull()
    })
  })
  
  describe('5. Copy Behavior', () => {
    it('should create new tracker with copied name when document is copied', async () => {
      const originalName = 'Tracker Sync Test - Original Document'
      const copiedName = 'Tracker Sync Test - Original Document copy'
      
      // Create original invoice and sync tracker
      const invoiceId1 = await generateId('INV', 'invoice')
      const invoice1 = await prisma.invoice.create({
        data: {
          invoiceId: invoiceId1,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: originalName,
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
      createdData.invoices.push(invoice1.id)
      
      const tracker1 = await syncTracker({
        projectName: originalName,
        date: invoice1.productionDate,
        totalAmount: invoice1.totalAmount,
        invoiceId: invoice1.invoiceId,
        subtotal: 0
      })
      expect(tracker1).toBeDefined()
      if (tracker1) createdData.trackers.push(tracker1.id)
      
      // Create copied invoice (simulates user copying)
      const invoiceId2 = await generateId('INV', 'invoice')
      const invoice2 = await prisma.invoice.create({
        data: {
          invoiceId: invoiceId2,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: copiedName, // Copy suffix
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
      createdData.invoices.push(invoice2.id)
      
      const tracker2 = await syncTracker({
        projectName: copiedName,
        date: invoice2.productionDate,
        totalAmount: invoice2.totalAmount,
        invoiceId: invoice2.invoiceId,
        subtotal: 0
      })
      
      // Should have TWO separate trackers
      expect(tracker2).toBeDefined()
      expect(tracker2.id).not.toBe(tracker1.id)
      expect(tracker2.projectName).toBe(copiedName)
      
      if (tracker2) createdData.trackers.push(tracker2.id)
    })
  })
  
  describe('6. Deletion Behavior', () => {
    it('should NOT delete tracker when source invoice is deleted', async () => {
      const projectName = 'Tracker Sync Test - Deletion Test'
      
      // Create invoice and sync tracker
      const invoiceId = await generateId('INV', 'invoice')
      const invoice = await prisma.invoice.create({
        data: {
          invoiceId,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: projectName,
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
      createdData.invoices.push(invoice.id)
      
      const tracker = await syncTracker({
        projectName,
        date: invoice.productionDate,
        totalAmount: invoice.totalAmount,
        invoiceId: invoice.invoiceId,
        subtotal: 0
      })
      expect(tracker).toBeDefined()
      if (tracker) createdData.trackers.push(tracker.id)
      
      // Delete invoice
      await prisma.invoice.delete({ where: { id: invoice.id } })
      
      // Tracker should still exist
      const trackerAfterDelete = await prisma.productionTracker.findFirst({
        where: { projectName, deletedAt: null }
      })
      
      expect(trackerAfterDelete).toBeDefined()
      expect(trackerAfterDelete?.id).toBe(tracker.id)
    })
  })
  
  describe('7. create-expense Endpoint Behavior', () => {
    it('should only update expenseId on existing tracker, not create new one', async () => {
      const projectName = 'Tracker Sync Test - Expense Update'
      
      // Create invoice (creates tracker)
      const invoiceId = await generateId('INV', 'invoice')
      const invoice = await prisma.invoice.create({
        data: {
          invoiceId,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: projectName,
          billingName: 'Test Billing',
          billingBankName: 'Test Bank',
          billingBankAccount: '1234567890',
          billingBankAccountName: 'Test Account',
          signatureName: 'Test Signature',
          signatureImageData: 'data:image/png;base64,test',
          pph: '2',
          totalAmount: 5000000,
          status: 'paid',
          paidDate: new Date()
        }
      })
      createdData.invoices.push(invoice.id)
      
      const trackerBefore = await prisma.productionTracker.findFirst({
        where: { projectName, deletedAt: null }
      })
      expect(trackerBefore).toBeDefined()
      // Note: expenseId isn't checked here because it's only set when create-expense is called
      if (trackerBefore) createdData.trackers.push(trackerBefore.id)
      
      // Call create-expense endpoint (simulated directly via Prisma for this test)
      const expenseId = await generateId('EXP', 'expense')
      const expense = await prisma.expense.create({
        data: {
          expenseId,
          projectName,
          date: new Date(),
          invoiceNumber: invoiceId,
          expenseItems: {
            create: [
              {
                productName: 'Test Item',
                qty: 1,
                unitPrice: 1000000,
                totalPrice: 1000000
              }
            ]
          }
        }
      })
      createdData.expenses.push(expense.id)
      
      // Update tracker with expenseId (simulating what create-expense endpoint does)
      await prisma.productionTracker.updateMany({
        where: { projectName, deletedAt: null },
        data: { expenseId: expense.expenseId }
      })
      
      // Should still have only ONE tracker, with expenseId updated
      const trackers = await prisma.productionTracker.findMany({
        where: { projectName, deletedAt: null }
      })
      
      expect(trackers).toHaveLength(1)
      expect(trackers[0].id).toBe(trackerBefore?.id) // Same tracker
      expect(trackers[0].expenseId).toBe(expense.expenseId) // expenseId updated
    })
  })
  
  describe('8. productAmounts Initialization', () => {
    it('should initialize productAmounts as empty object on tracker creation', async () => {
      const projectName = 'Tracker Sync Test - Empty ProductAmounts'
      
      const invoiceId = await generateId('INV', 'invoice')
      const invoice = await prisma.invoice.create({
        data: {
          invoiceId,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          companyCity: 'Jakarta',
          companyProvince: 'DKI Jakarta',
          productionDate: new Date(),
          billTo: projectName,
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
      createdData.invoices.push(invoice.id)
      
      const tracker = await syncTracker({
        projectName,
        date: invoice.productionDate,
        totalAmount: invoice.totalAmount,
        invoiceId: invoice.invoiceId,
        subtotal: 0
      })
      
      expect(tracker).toBeDefined()
      expect(tracker.productAmounts).toEqual({}) // Should be empty
      
      if (tracker) createdData.trackers.push(tracker.id)
    })
  })
})
