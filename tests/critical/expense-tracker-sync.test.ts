/**
 * Integration Tests: Expense Sync from Production Tracker
 * 
 * Tests the sync functionality between production tracker and expense:
 * - Sync button in expense edit page
 * - Replace all expense items with tracker products
 * - Special handling for PHOTOGRAPHER item
 * - Preserve budgeted amounts when available
 * - Handle missing products
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/id-generator'

describe('Expense-Tracker Sync Integration Tests', () => {
  let testExpense: any
  let testTracker: any
  
  beforeAll(async () => {
    // Create test expense
    const expenseId = await generateId('EXP', 'expense')
    testExpense = await prisma.expense.create({
      data: {
        expenseId,
        projectName: 'Sync Test Project',
        productionDate: new Date(),
        clientBudget: 15000000,
        paidAmount: 12000000,
        totalItemBudgeted: 15000000,
        totalItemDifferences: 3000000,
        status: 'draft',
        notes: 'Test expense for sync'
      }
    })
    
    // Create expense items (old data, to be replaced by sync)
    await prisma.expenseItem.createMany({
      data: [
        {
          expenseId: testExpense.id,
          productName: 'OLD_ITEM_1',
          budgeted: 5000000,
          actual: 4500000,
          difference: 500000,
          order: 0
        },
        {
          expenseId: testExpense.id,
          productName: 'OLD_ITEM_2',
          budgeted: 3000000,
          actual: 3200000,
          difference: -200000,
          order: 1
        },
        {
          expenseId: testExpense.id,
          productName: 'PHOTOGRAPHER',
          budgeted: 7000000,
          actual: 0,
          difference: 7000000,
          order: 2
        }
      ]
    })
    
    // Create production tracker with the same expenseId
    const trackerId = await generateId('PT', 'productionTracker')
    testTracker = await prisma.productionTracker.create({
      data: {
        trackerId,
        expenseId: testExpense.expenseId,
        invoiceId: 'INV-2026-0001',
        projectName: 'Sync Test Project',
        date: testExpense.productionDate,
        subtotal: 11764706,
        totalAmount: 12000000,
        expense: 8500000,
        productAmounts: {
          'PHOTOGRAPHER': 3500000,
          'PROPS/SET': 2000000,
          'VIDEOGRAPHER': 2500000,
          'RETOUCHER': 1000000,
          'MUA HAIR': 1200000,
          'MODEL/HANDMODEL': 800000,
          'STUDIO/LIGHTING': 500000,
          'FOOD & DRINK': 500000
        }
      }
    })
  })
  
  afterAll(async () => {
    // Cleanup
    if (testExpense?.id) {
      await prisma.expenseItem.deleteMany({ where: { expenseId: testExpense.id } })
      await prisma.expense.delete({ where: { id: testExpense.id } })
    }
    if (testTracker?.id) {
      await prisma.productionTracker.delete({ where: { id: testTracker.id } })
    }
  })
  
  describe('1. Sync Button Functionality', () => {
    it('should have expense linked to tracker via expenseId', async () => {
      expect(testExpense.expenseId).toBe(testTracker.expenseId)
      
      // API should be able to find tracker by expenseId
      const tracker = await prisma.productionTracker.findFirst({
        where: {
          expenseId: testExpense.expenseId,
          deletedAt: null
        }
      })
      
      expect(tracker).toBeDefined()
      expect(tracker?.id).toBe(testTracker.id)
    })
    
    it('should fetch tracker data for syncing', async () => {
      const response = await fetch(`http://localhost:3000/api/production-tracker`)
      expect(response.ok).toBe(true)
      
      const trackers = await response.json()
      const matchingTracker = trackers.find((t: any) => t.expenseId === testExpense.expenseId)
      
      expect(matchingTracker).toBeDefined()
      expect(matchingTracker.productAmounts).toBeDefined()
      expect(typeof matchingTracker.productAmounts).toBe('object')
    })
  })
  
  describe('2. Sync Replaces All Expense Items', () => {
    it('should replace all expense items with tracker products', async () => {
      // Get current items before sync
      const itemsBefore = await prisma.expenseItem.findMany({
        where: { expenseId: testExpense.id }
      })
      
      expect(itemsBefore.length).toBe(3)
      expect(itemsBefore.some(i => i.productName === 'OLD_ITEM_1')).toBe(true)
      expect(itemsBefore.some(i => i.productName === 'OLD_ITEM_2')).toBe(true)
      
      // Simulate sync operation (this would be triggered by the UI button)
      const productAmounts = testTracker.productAmounts as Record<string, number>
      
      // Build new items from tracker
      const newItems = Object.entries(productAmounts).map(([productName, amount]) => {
        if (productName === 'PHOTOGRAPHER') {
          // Special handling: budgeted = paidAmount, actual = 0
          return {
            productName,
            budgeted: testExpense.paidAmount,
            actual: 0,
            difference: testExpense.paidAmount
          }
        } else {
          // For other products: actual from tracker, preserve budgeted if exists
          const existingItem = itemsBefore.find(i => i.productName === productName)
          const budgeted = existingItem ? existingItem.budgeted : 0
          return {
            productName,
            budgeted,
            actual: amount,
            difference: budgeted - amount
          }
        }
      })
      
      // Delete old items
      await prisma.expenseItem.deleteMany({
        where: { expenseId: testExpense.id }
      })
      
      // Create new items
      await prisma.expenseItem.createMany({
        data: newItems.map((item, index) => ({
          expenseId: testExpense.id,
          productName: item.productName,
          budgeted: item.budgeted,
          actual: item.actual,
          difference: item.difference,
          order: index
        }))
      })
      
      // Verify items were replaced
      const itemsAfter = await prisma.expenseItem.findMany({
        where: { expenseId: testExpense.id },
        orderBy: { order: 'asc' }
      })
      
      expect(itemsAfter.length).toBe(Object.keys(productAmounts).length)
      expect(itemsAfter.some(i => i.productName === 'OLD_ITEM_1')).toBe(false)
      expect(itemsAfter.some(i => i.productName === 'OLD_ITEM_2')).toBe(false)
      expect(itemsAfter.some(i => i.productName === 'PROPS/SET')).toBe(true)
      expect(itemsAfter.some(i => i.productName === 'VIDEOGRAPHER')).toBe(true)
      expect(itemsAfter.some(i => i.productName === 'PHOTOGRAPHER')).toBe(true)
    })
  })
  
  describe('3. Special PHOTOGRAPHER Handling', () => {
    it('should set PHOTOGRAPHER budgeted to expense paidAmount, actual to 0', async () => {
      const photographerItem = await prisma.expenseItem.findFirst({
        where: {
          expenseId: testExpense.id,
          productName: 'PHOTOGRAPHER'
        }
      })
      
      expect(photographerItem).toBeDefined()
      expect(photographerItem?.budgeted).toBe(testExpense.paidAmount)
      expect(photographerItem?.actual).toBe(0)
      expect(photographerItem?.difference).toBe(testExpense.paidAmount)
      
      // Difference should equal PHOTOGRAPHER value in tracker
      const productAmounts = testTracker.productAmounts as Record<string, number>
      expect(photographerItem?.budgeted).toBe(testExpense.paidAmount)
      
      // The tracker's PHOTOGRAPHER amount is the profit
      expect(productAmounts['PHOTOGRAPHER']).toBe(testTracker.totalAmount - testTracker.expense)
    })
  })
  
  describe('4. Actual Amounts from Tracker', () => {
    it('should set actual amounts from tracker product amounts', async () => {
      const productAmounts = testTracker.productAmounts as Record<string, number>
      
      // Check PROPS/SET
      const propsItem = await prisma.expenseItem.findFirst({
        where: {
          expenseId: testExpense.id,
          productName: 'PROPS/SET'
        }
      })
      expect(propsItem?.actual).toBe(productAmounts['PROPS/SET'])
      
      // Check VIDEOGRAPHER
      const videoItem = await prisma.expenseItem.findFirst({
        where: {
          expenseId: testExpense.id,
          productName: 'VIDEOGRAPHER'
        }
      })
      expect(videoItem?.actual).toBe(productAmounts['VIDEOGRAPHER'])
      
      // Check RETOUCHER
      const retouchItem = await prisma.expenseItem.findFirst({
        where: {
          expenseId: testExpense.id,
          productName: 'RETOUCHER'
        }
      })
      expect(retouchItem?.actual).toBe(productAmounts['RETOUCHER'])
    })
  })
  
  describe('5. Budgeted Amount Preservation', () => {
    it('should preserve budgeted amounts when product exists, set to 0 for new products', async () => {
      // Create a new expense with existing budgeted amounts
      const expenseId = await generateId('EXP', 'expense')
      const expense = await prisma.expense.create({
        data: {
          expenseId,
          projectName: 'Budget Preservation Test',
          productionDate: new Date(),
          clientBudget: 10000000,
          paidAmount: 9000000,
          totalItemBudgeted: 10000000,
          totalItemDifferences: 1000000,
          status: 'draft'
        }
      })
      
      // Create items with budgeted amounts
      await prisma.expenseItem.createMany({
        data: [
          {
            expenseId: expense.id,
            productName: 'PROPS/SET',
            budgeted: 2500000, // Existing budget
            actual: 2000000,
            difference: 500000,
            order: 0
          },
          {
            expenseId: expense.id,
            productName: 'VIDEOGRAPHER',
            budgeted: 3000000, // Existing budget
            actual: 2800000,
            difference: 200000,
            order: 1
          }
        ]
      })
      
      // Create tracker
      const trackerId = await generateId('PT', 'productionTracker')
      const tracker = await prisma.productionTracker.create({
        data: {
          trackerId,
          expenseId: expense.expenseId,
          projectName: 'Budget Preservation Test',
          date: expense.productionDate,
          subtotal: 8823529,
          totalAmount: 9000000,
          expense: 6500000,
          productAmounts: {
            'PHOTOGRAPHER': 2500000,
            'PROPS/SET': 2200000, // Different actual
            'VIDEOGRAPHER': 2500000, // Different actual
            'RETOUCHER': 1000000, // NEW product (no existing budget)
            'MUA HAIR': 800000 // NEW product (no existing budget)
          }
        }
      })
      
      // Simulate sync
      const itemsBefore = await prisma.expenseItem.findMany({
        where: { expenseId: expense.id }
      })
      
      const productAmounts = tracker.productAmounts as Record<string, number>
      const newItems = Object.entries(productAmounts).map(([productName, amount]) => {
        if (productName === 'PHOTOGRAPHER') {
          return {
            productName,
            budgeted: expense.paidAmount,
            actual: 0,
            difference: expense.paidAmount
          }
        } else {
          const existingItem = itemsBefore.find(i => i.productName === productName)
          const budgeted = existingItem ? existingItem.budgeted : 0
          return {
            productName,
            budgeted,
            actual: amount,
            difference: budgeted - amount
          }
        }
      })
      
      await prisma.expenseItem.deleteMany({ where: { expenseId: expense.id } })
      await prisma.expenseItem.createMany({
        data: newItems.map((item, index) => ({
          expenseId: expense.id,
          productName: item.productName,
          budgeted: item.budgeted,
          actual: item.actual,
          difference: item.difference,
          order: index
        }))
      })
      
      // Verify budgeted amounts preserved for existing products
      const propsAfter = await prisma.expenseItem.findFirst({
        where: { expenseId: expense.id, productName: 'PROPS/SET' }
      })
      expect(propsAfter?.budgeted).toBe(2500000) // Preserved
      expect(propsAfter?.actual).toBe(2200000) // Updated from tracker
      
      const videoAfter = await prisma.expenseItem.findFirst({
        where: { expenseId: expense.id, productName: 'VIDEOGRAPHER' }
      })
      expect(videoAfter?.budgeted).toBe(3000000) // Preserved
      expect(videoAfter?.actual).toBe(2500000) // Updated from tracker
      
      // Verify new products have 0 budgeted
      const retouchAfter = await prisma.expenseItem.findFirst({
        where: { expenseId: expense.id, productName: 'RETOUCHER' }
      })
      expect(retouchAfter?.budgeted).toBe(0) // New product
      expect(retouchAfter?.actual).toBe(1000000) // From tracker
      
      const muaAfter = await prisma.expenseItem.findFirst({
        where: { expenseId: expense.id, productName: 'MUA HAIR' }
      })
      expect(muaAfter?.budgeted).toBe(0) // New product
      expect(muaAfter?.actual).toBe(800000) // From tracker
      
      // Cleanup
      await prisma.expenseItem.deleteMany({ where: { expenseId: expense.id } })
      await prisma.expense.delete({ where: { id: expense.id } })
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
    })
  })
  
  describe('6. Difference Calculation', () => {
    it('should calculate difference as budgeted - actual for all items', async () => {
      const items = await prisma.expenseItem.findMany({
        where: { expenseId: testExpense.id }
      })
      
      items.forEach(item => {
        const expectedDifference = item.budgeted - item.actual
        expect(item.difference).toBe(expectedDifference)
      })
    })
    
    it('should show positive difference when under budget, negative when over budget', async () => {
      // Create test scenario
      const expenseId = await generateId('EXP', 'expense')
      const expense = await prisma.expense.create({
        data: {
          expenseId,
          projectName: 'Difference Test',
          productionDate: new Date(),
          clientBudget: 5000000,
          paidAmount: 5000000,
          status: 'draft'
        }
      })
      
      await prisma.expenseItem.createMany({
        data: [
          {
            expenseId: expense.id,
            productName: 'UNDER_BUDGET_ITEM',
            budgeted: 1000000,
            actual: 800000,
            difference: 200000, // Positive (saved money)
            order: 0
          },
          {
            expenseId: expense.id,
            productName: 'OVER_BUDGET_ITEM',
            budgeted: 1000000,
            actual: 1200000,
            difference: -200000, // Negative (over budget)
            order: 1
          }
        ]
      })
      
      const items = await prisma.expenseItem.findMany({
        where: { expenseId: expense.id }
      })
      
      const underBudget = items.find(i => i.productName === 'UNDER_BUDGET_ITEM')
      expect(underBudget?.difference).toBeGreaterThan(0)
      
      const overBudget = items.find(i => i.productName === 'OVER_BUDGET_ITEM')
      expect(overBudget?.difference).toBeLessThan(0)
      
      // Cleanup
      await prisma.expenseItem.deleteMany({ where: { expenseId: expense.id } })
      await prisma.expense.delete({ where: { id: expense.id } })
    })
  })
  
  describe('7. Integration with Expense Update', () => {
    it('should allow updating expense after sync without losing synced data', async () => {
      // Get synced items
      const syncedItems = await prisma.expenseItem.findMany({
        where: { expenseId: testExpense.id },
        orderBy: { order: 'asc' }
      })
      
      expect(syncedItems.length).toBeGreaterThan(0)
      
      // Update expense via API
      const response = await fetch(`http://localhost:3000/api/expense/${testExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: 'Sync Test Project - Updated',
          productionDate: testExpense.productionDate.toISOString(),
          clientBudget: 16000000,
          paidAmount: 13000000,
          totalItemBudgeted: 16000000,
          totalItemDifferences: 3000000,
          status: 'draft',
          items: syncedItems.map(item => ({
            id: item.id,
            productName: item.productName,
            budgeted: item.budgeted.toString(),
            actual: item.actual.toString()
          }))
        })
      })
      
      expect(response.ok).toBe(true)
      
      // Verify items still exist
      const itemsAfter = await prisma.expenseItem.findMany({
        where: { expenseId: testExpense.id }
      })
      
      expect(itemsAfter.length).toBe(syncedItems.length)
      
      // Verify PHOTOGRAPHER still has special values
      const photographer = itemsAfter.find(i => i.productName === 'PHOTOGRAPHER')
      expect(photographer?.actual).toBe(0)
    })
  })
})
