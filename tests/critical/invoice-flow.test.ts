import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'

/**
 * 🔴 CRITICAL: Invoice Complete Flow Integration Test
 * 
 * Tests ALL invoice features from creation to deletion
 * Ensures new features don't break existing functionality
 */
describe('🔴 CRITICAL: Invoice Complete Flow', () => {
  let testInvoiceId: string

  afterAll(async () => {
    // Cleanup any leftover data
    await prisma.invoice.deleteMany({
      where: { invoiceId: { startsWith: 'INV-TEST-' } }
    })
  })

  it('FEATURE 1: Should create invoice with all basic fields', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceId: `INV-TEST-${Date.now()}`,
        planningId: null, // Can be null
        companyName: 'Test Company',
        companyAddress: 'Jl. Test No. 123',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        companyPostalCode: '12345',
        companyTelp: '021-12345678',
        companyEmail: 'test@company.com',
        productionDate: new Date('2024-12-01'),
        paidDate: null, // Not paid yet
        billTo: 'Test Client',
        billToEmail: 'client@test.com',
        notes: 'Test invoice notes',
        billingName: 'Test Billing',
        billingBankName: 'Bank BCA',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        billingKtp: '1234567890123456',
        billingNpwp: '12.345.678.9-012.345',
        signatureName: 'Test Signature',
        signatureRole: 'Director',
        signatureImageData: 'data:image/png;base64,test',
        pph: '2',
        totalAmount: 11020408.16,
        summaryOrder: 'subtotal,pph,total',
        termsAndConditions: 'Payment within 30 days',
        status: 'draft'
      }
    })

    testInvoiceId = invoice.id

    // Verify all fields
    expect(invoice.invoiceId).toContain('INV-TEST-')
    expect(invoice.companyName).toBe('Test Company')
    expect(invoice.billTo).toBe('Test Client')
    expect(invoice.paidDate).toBeNull() // Not paid yet
    expect(invoice.status).toBe('draft')
    expect(invoice.totalAmount).toBe(11020408.16)

    // Cleanup
    await prisma.invoice.delete({ where: { id: invoice.id } })
  })

  it('FEATURE 2: Should create invoice with items and nested details', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceId: `INV-ITEMS-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Jl. Test',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        productionDate: new Date(),
        billTo: 'Test Client',
        billingName: 'Test Billing',
        billingBankName: 'Bank BCA',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'test',
        pph: '2',
        totalAmount: 10800000,
        items: {
          create: [
            {
              productName: 'Design Services',
              total: 5000000,
              order: 0,
              details: {
                create: [
                  { detail: 'Logo Design', unitPrice: 2000000, qty: 1, amount: 2000000 },
                  { detail: 'Brand Guidelines', unitPrice: 3000000, qty: 1, amount: 3000000 }
                ]
              }
            },
            {
              productName: 'Development',
              total: 5800000,
              order: 1,
              details: {
                create: [
                  { detail: 'Website Development', unitPrice: 5000000, qty: 1, amount: 5000000 },
                  { detail: 'Testing', unitPrice: 800000, qty: 1, amount: 800000 }
                ]
              }
            }
          ]
        }
      },
      include: {
        items: {
          include: { details: true },
          orderBy: { order: 'asc' }
        }
      }
    })

    // Verify structure
    expect(invoice.items.length).toBe(2)
    expect(invoice.items[0].productName).toBe('Design Services')
    expect(invoice.items[0].details.length).toBe(2)
    expect(invoice.items[0].details[0].detail).toBe('Logo Design')

    // Cleanup
    await prisma.invoice.delete({ where: { id: invoice.id } })
  })

  it('FEATURE 3: Should create invoice with remarks (ordered)', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceId: `INV-REMARKS-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        productionDate: new Date(),
        billTo: 'Test Client',
        billingName: 'Test Billing',
        billingBankName: 'Bank BCA',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'test',
        pph: '2',
        totalAmount: 10000000,
        remarks: {
          create: [
            { text: 'Payment received', isCompleted: true, order: 0 },
            { text: 'Send receipt to client', isCompleted: false, order: 1 },
            { text: 'Follow up after 30 days', isCompleted: false, order: 2 }
          ]
        }
      },
      include: {
        remarks: { orderBy: { order: 'asc' } }
      }
    })

    expect(invoice.remarks.length).toBe(3)
    expect(invoice.remarks[0].text).toBe('Payment received')
    expect(invoice.remarks[0].isCompleted).toBe(true)
    expect(invoice.remarks[1].isCompleted).toBe(false)

    // Cleanup
    await prisma.invoice.delete({ where: { id: invoice.id } })
  })

  it('FEATURE 4: Should create invoice with custom signatures', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceId: `INV-SIGS-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        productionDate: new Date(),
        billTo: 'Test Client',
        billingName: 'Test Billing',
        billingBankName: 'Bank BCA',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'test',
        pph: '2',
        totalAmount: 10000000,
        signatures: {
          create: [
            { name: 'Finance Manager', position: 'Manager', imageData: '', order: 0 },
            { name: 'Client Representative', position: 'Client', imageData: '', order: 1 }
          ]
        }
      },
      include: {
        signatures: { orderBy: { order: 'asc' } }
      }
    })

    expect(invoice.signatures.length).toBe(2)
    expect(invoice.signatures[0].name).toBe('Finance Manager')
    expect(invoice.signatures[1].position).toBe('Client')

    // Cleanup
    await prisma.invoice.delete({ where: { id: invoice.id } })
  })

  it('FEATURE 5: Should update invoice status and paid date', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceId: `INV-PAID-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        productionDate: new Date('2024-12-01'),
        paidDate: null,
        billTo: 'Test Client',
        billingName: 'Test Billing',
        billingBankName: 'Bank BCA',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'test',
        pph: '2',
        totalAmount: 10000000,
        status: 'pending'
      }
    })

    expect(invoice.status).toBe('pending')
    expect(invoice.paidDate).toBeNull()

    // Mark as paid
    const paid = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'paid',
        paidDate: new Date('2024-12-15')
      }
    })

    expect(paid.status).toBe('paid')
    expect(paid.paidDate).toBeTruthy()
    expect(paid.paidDate?.toISOString()).toContain('2024-12-15')

    // Cleanup
    await prisma.invoice.delete({ where: { id: invoice.id } })
  })

  it('FEATURE 6: Should update invoice - UPSERT items', async () => {
    // Create with 2 items
    const original = await prisma.invoice.create({
      data: {
        invoiceId: `INV-UPSERT-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        productionDate: new Date(),
        billTo: 'Test Client',
        billingName: 'Test Billing',
        billingBankName: 'Bank BCA',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'test',
        pph: '2',
        totalAmount: 10000000,
        items: {
          create: [
            {
              productName: 'Service A',
              total: 5000000,
              order: 0,
              details: {
                create: [{ detail: 'Detail A', unitPrice: 5000000, qty: 1, amount: 5000000 }]
              }
            },
            {
              productName: 'Service B',
              total: 5000000,
              order: 1,
              details: {
                create: [{ detail: 'Detail B', unitPrice: 5000000, qty: 1, amount: 5000000 }]
              }
            }
          ]
        }
      },
      include: { items: { include: { details: true } } }
    })

    const itemAId = original.items[0].id

    // UPSERT: Update A, delete B, create C
    await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.update({
        where: { id: itemAId },
        data: { productName: 'Updated Service A', total: 6000000 }
      })

      await tx.invoiceItem.deleteMany({
        where: {
          invoiceId: original.id,
          id: { not: itemAId }
        }
      })

      await tx.invoiceItem.create({
        data: {
          invoiceId: original.id,
          productName: 'Service C',
          total: 4000000,
          order: 2,
          details: {
            create: [{ detail: 'Detail C', unitPrice: 4000000, qty: 1, amount: 4000000 }]
          }
        }
      })
    })

    const result = await prisma.invoice.findUnique({
      where: { id: original.id },
      include: { items: true }
    })

    expect(result?.items.length).toBe(2) // A + C
    expect(result?.items.find(i => i.productName === 'Updated Service A')).toBeTruthy()
    expect(result?.items.find(i => i.productName === 'Service C')).toBeTruthy()

    // Cleanup
    await prisma.invoice.delete({ where: { id: original.id } })
  })

  it('FEATURE 7: Should link invoice to planning', async () => {
    // Create planning first
    const planning = await prisma.planning.create({
      data: {
        planningId: `PLAN-TEST-${Date.now()}`,
        projectName: 'Test Project',
        clientName: 'Test Client',
        clientBudget: 10000000
      }
    })

    // Create invoice linked to planning
    const invoice = await prisma.invoice.create({
      data: {
        invoiceId: `INV-LINK-${Date.now()}`,
        planningId: planning.id, // Link to planning
        companyName: 'Test Company',
        companyAddress: 'Test',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        productionDate: new Date(),
        billTo: 'Test Client',
        billingName: 'Test Billing',
        billingBankName: 'Bank BCA',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'test',
        pph: '2',
        totalAmount: 10000000,
        status: 'draft'
      }
    })

    expect(invoice.planningId).toBe(planning.id)

    // Verify can find invoice by planningId
    const found = await prisma.invoice.findMany({
      where: { planningId: planning.id }
    })
    expect(found.length).toBe(1)
    expect(found[0].id).toBe(invoice.id)

    // Cleanup
    await prisma.invoice.delete({ where: { id: invoice.id } })
    await prisma.planning.delete({ where: { id: planning.id } })
  })

  it('FEATURE 8: Should delete invoice with cascade', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceId: `INV-DELETE-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        productionDate: new Date(),
        billTo: 'Test Client',
        billingName: 'Test Billing',
        billingBankName: 'Bank BCA',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'test',
        pph: '2',
        totalAmount: 10000000,
        items: {
          create: {
            productName: 'Service',
            total: 5000000,
            order: 0,
            details: {
              create: { detail: 'Detail', unitPrice: 5000000, qty: 1, amount: 5000000 }
            }
          }
        },
        remarks: {
          create: { text: 'Remark', isCompleted: false, order: 0 }
        },
        signatures: {
          create: { name: 'Sig', position: 'Manager', imageData: '', order: 0 }
        }
      },
      include: {
        items: { include: { details: true } },
        remarks: true,
        signatures: true
      }
    })

    const itemId = invoice.items[0].id
    const detailId = invoice.items[0].details[0].id
    const remarkId = invoice.remarks[0].id
    const signatureId = invoice.signatures[0].id

    // Delete
    await prisma.invoice.delete({ where: { id: invoice.id } })

    // Verify cascade
    const item = await prisma.invoiceItem.findUnique({ where: { id: itemId } })
    const detail = await prisma.invoiceItemDetail.findUnique({ where: { id: detailId } })
    const remark = await prisma.invoiceRemark.findUnique({ where: { id: remarkId } })
    const signature = await prisma.invoiceSignature.findUnique({ where: { id: signatureId } })

    expect(item).toBeNull()
    expect(detail).toBeNull()
    expect(remark).toBeNull()
    expect(signature).toBeNull()
  })

  it('FEATURE 9: Should handle invoice with expense relation', async () => {
    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceId: `INV-EXP-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        productionDate: new Date(),
        billTo: 'Test Client',
        billingName: 'Test Billing',
        billingBankName: 'Bank BCA',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'test',
        pph: '2',
        totalAmount: 10000000,
        status: 'paid'
      }
    })

    // Create expense linked to invoice
    const expense = await prisma.expense.create({
      data: {
        expenseId: `EXP-TEST-${Date.now()}`,
        invoiceId: invoice.id, // Link to invoice
        projectName: 'Test Project',
        productionDate: new Date(),
        clientBudget: 10000000,
        paidAmount: 10000000,
        totalItemBudgeted: 10000000,
        totalItemDifferences: 0
      }
    })

    expect(expense.invoiceId).toBe(invoice.id)

    // Verify relationship
    const invoiceWithExpenses = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { expenses: true }
    })
    expect(invoiceWithExpenses?.expenses.length).toBe(1)
    expect(invoiceWithExpenses?.expenses[0].id).toBe(expense.id)

    // Cleanup
    await prisma.expense.delete({ where: { id: expense.id } })
    await prisma.invoice.delete({ where: { id: invoice.id } })
  })

  it('FEATURE 10: Should change invoice status flow (draft → pending → paid)', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceId: `INV-STATUS-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        productionDate: new Date(),
        paidDate: null,
        billTo: 'Test Client',
        billingName: 'Test Billing',
        billingBankName: 'Bank BCA',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'test',
        pph: '2',
        totalAmount: 10000000,
        status: 'draft'
      }
    })

    // draft → pending
    let updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'pending' }
    })
    expect(updated.status).toBe('pending')
    expect(updated.paidDate).toBeNull()

    // pending → paid (set paid date)
    updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'paid',
        paidDate: new Date()
      }
    })
    expect(updated.status).toBe('paid')
    expect(updated.paidDate).toBeTruthy()

    // Cleanup
    await prisma.invoice.delete({ where: { id: invoice.id } })
  })

  it('FEATURE 11: Should handle optional fields (null values)', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceId: `INV-NULL-${Date.now()}`,
        planningId: null, // Optional
        companyName: 'Test Company',
        companyAddress: 'Test',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        companyPostalCode: null, // Optional
        companyTelp: null, // Optional
        companyEmail: null, // Optional
        productionDate: new Date(),
        paidDate: null, // Optional (not paid yet)
        billTo: 'Test Client',
        billToEmail: null, // Optional
        notes: null, // Optional
        billingName: 'Test Billing',
        billingBankName: 'Bank BCA',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        billingKtp: null, // Optional
        billingNpwp: null, // Optional
        signatureName: 'Test Signature',
        signatureRole: null, // Optional
        signatureImageData: 'test',
        pph: '2',
        totalAmount: 10000000,
        termsAndConditions: null // Optional
      }
    })

    expect(invoice.planningId).toBeNull()
    expect(invoice.paidDate).toBeNull()
    expect(invoice.notes).toBeNull()
    expect(invoice.termsAndConditions).toBeNull()

    // Cleanup
    await prisma.invoice.delete({ where: { id: invoice.id } })
  })
})
