/**
 * Test Data Helpers
 * Create realistic test data for all critical features
 */

import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/id-generator'

export const createTestCompany = async (name?: string) => {
  return await prisma.company.create({
    data: {
      name: name || `Test Company ${Date.now()}`,
      address: 'Jl. Test No. 123',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '12345',
      telp: '021-12345678',
      email: 'test@company.com'
    }
  })
}

export const createTestBilling = async (name?: string) => {
  return await prisma.billing.create({
    data: {
      name: name || `Test Billing ${Date.now()}`,
      bankName: 'Bank Test',
      bankAccount: '1234567890',
      bankAccountName: 'Test Account',
      ktp: '1234567890123456',
      npwp: '12.345.678.9-012.345'
    }
  })
}

export const createTestSignature = async (name?: string) => {
  return await prisma.signature.create({
    data: {
      name: name || `Test Signature ${Date.now()}`,
      role: 'Director',
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    }
  })
}

export const createTestQuotation = async (options: {
  companyName: string
  billingName: string
  signatureName: string
  status?: string
  notes?: string
}) => {
  const quotationId = await generateId('QTN', 'quotation')
  
  return await prisma.quotation.create({
    data: {
      quotationId,
      companyName: options.companyName,
      companyAddress: 'Jl. Test No. 123',
      companyCity: 'Jakarta',
      companyProvince: 'DKI Jakarta',
      companyPostalCode: '12345',
      companyTelp: '021-12345678',
      companyEmail: 'test@company.com',
      productionDate: new Date(),
      billTo: 'Test Client',
      billToEmail: 'client@test.com',
      notes: options.notes || 'Test notes',
      billingName: options.billingName,
      billingBankName: 'Bank Test',
      billingBankAccount: '1234567890',
      billingBankAccountName: 'Test Account',
      billingKtp: '1234567890123456',
      billingNpwp: '12.345.678.9-012.345',
      signatureName: options.signatureName,
      signatureRole: 'Director',
      signatureImageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      pph: '2',
      totalAmount: 0,
      summaryOrder: 'subtotal,pph,total',
      status: options.status || 'draft'
    }
  })
}

export const createTestPlanning = async (options?: {
  projectName?: string
  clientName?: string
  clientBudget?: number
  notes?: string
  status?: string
}) => {
  const planningId = await generateId('PLN', 'planning')
  
  return await prisma.planning.create({
    data: {
      planningId,
      projectName: options?.projectName || `Test Project ${Date.now()}`,
      clientName: options?.clientName || 'Test Client',
      clientBudget: options?.clientBudget || 10000000,
      notes: options?.notes || 'Test planning notes',
      status: options?.status || 'draft'
    }
  })
}

export const createTestExpense = async (options?: {
  projectName?: string
  productionDate?: Date
  clientBudget?: number
  paidAmount?: number
  notes?: string
  status?: string
}) => {
  const expenseId = await generateId('EXP', 'expense')
  
  return await prisma.expense.create({
    data: {
      expenseId,
      projectName: options?.projectName || `Test Expense ${Date.now()}`,
      productionDate: options?.productionDate || new Date(),
      clientBudget: options?.clientBudget || 10000000,
      paidAmount: options?.paidAmount || 9500000,
      totalItemBudgeted: 10000000,
      totalItemDifferences: -500000,
      notes: options?.notes || 'Test expense notes',
      status: options?.status || 'draft'
    }
  })
}
