import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'

/**
 * 🔴 CRITICAL: Quotation Complete Flow Integration Test
 * 
 * Tests ALL quotation features from creation to deletion
 * Ensures new features don't break existing functionality
 */
describe('🔴 CRITICAL: Quotation Complete Flow', () => {
  let testQuotationId: string
  let testCompanyId: string
  let testBillingId: string
  let testSignatureId: string

  // Setup test data
  beforeAll(async () => {
    // Create test company
    const company = await prisma.company.create({
      data: {
        name: `Test Company ${Date.now()}`,
        address: 'Jl. Test No. 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        telp: '021-12345678',
        email: 'test@company.com'
      }
    })
    testCompanyId = company.id

    // Create test billing
    const billing = await prisma.billing.create({
      data: {
        name: `Test Billing ${Date.now()}`,
        bankName: 'Bank BCA',
        bankAccount: '1234567890',
        bankAccountName: 'Test Account',
        ktp: '1234567890123456',
        npwp: '12.345.678.9-012.345'
      }
    })
    testBillingId = billing.id

    // Create test signature
    const signature = await prisma.signature.create({
      data: {
        name: `Test Signature ${Date.now()}`,
        role: 'Director',
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }
    })
    testSignatureId = signature.id
  })

  afterAll(async () => {
    // Cleanup - with error handling in case records don't exist
    if (testQuotationId) {
      await prisma.quotation.deleteMany({ where: { id: testQuotationId } }).catch(() => {})
    }
    if (testCompanyId) {
      await prisma.company.delete({ where: { id: testCompanyId } }).catch(() => {})
    }
    if (testBillingId) {
      await prisma.billing.delete({ where: { id: testBillingId } }).catch(() => {})
    }
    if (testSignatureId) {
      await prisma.signature.delete({ where: { id: testSignatureId } }).catch(() => {})
    }
  })

  it('FEATURE 1: Should create quotation with all basic fields', async () => {
    const quotation = await prisma.quotation.create({
      data: {
        quotationId: `QTN-TEST-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Jl. Test No. 123',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        companyPostalCode: '12345',
        companyTelp: '021-12345678',
        companyEmail: 'test@company.com',
        productionDate: new Date('2024-12-01'),
        billTo: 'Test Client',
        billToEmail: 'client@test.com',
        notes: 'Test quotation notes',
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

    testQuotationId = quotation.id

    // Verify all fields saved correctly
    expect(quotation.quotationId).toContain('QTN-TEST-')
    expect(quotation.companyName).toBe('Test Company')
    expect(quotation.companyEmail).toBe('test@company.com')
    expect(quotation.billTo).toBe('Test Client')
    expect(quotation.billToEmail).toBe('client@test.com')
    expect(quotation.notes).toBe('Test quotation notes')
    expect(quotation.pph).toBe('2')
    expect(quotation.totalAmount).toBe(11020408.16)
    expect(quotation.summaryOrder).toBe('subtotal,pph,total')
    expect(quotation.termsAndConditions).toBe('Payment within 30 days')
    expect(quotation.status).toBe('draft')
  })

  it('FEATURE 2: Should create quotation with items and nested details', async () => {
    const quotation = await prisma.quotation.create({
      data: {
        quotationId: `QTN-ITEMS-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Jl. Test No. 123',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        productionDate: new Date(),
        billTo: 'Test Client',
        billingName: 'Test Billing',
        billingBankName: 'Bank BCA',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'data:image/png;base64,test',
        pph: '2',
        totalAmount: 10800000,
        items: {
          create: [
            {
              productName: 'Video Production',
              total: 5000000,
              order: 0,
              details: {
                create: [
                  { detail: 'Filming 2 days', unitPrice: 2000000, qty: 1, amount: 2000000 },
                  { detail: 'Editing', unitPrice: 1500000, qty: 2, amount: 3000000 }
                ]
              }
            },
            {
              productName: 'Photography',
              total: 5800000,
              order: 1,
              details: {
                create: [
                  { detail: 'Product photos', unitPrice: 500000, qty: 10, amount: 5000000 },
                  { detail: 'Retouching', unitPrice: 800000, qty: 1, amount: 800000 }
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

    // Verify items created with correct order
    expect(quotation.items.length).toBe(2)
    expect(quotation.items[0].productName).toBe('Video Production')
    expect(quotation.items[0].total).toBe(5000000)
    expect(quotation.items[0].order).toBe(0)

    // Verify nested details
    expect(quotation.items[0].details.length).toBe(2)
    expect(quotation.items[0].details[0].detail).toBe('Filming 2 days')
    expect(quotation.items[0].details[0].unitPrice).toBe(2000000)
    expect(quotation.items[0].details[0].qty).toBe(1)
    expect(quotation.items[0].details[0].amount).toBe(2000000)

    // Verify second item
    expect(quotation.items[1].details.length).toBe(2)
    expect(quotation.items[1].details[0].detail).toBe('Product photos')

    // Cleanup
    await prisma.quotation.delete({ where: { id: quotation.id } })
  })

  it('FEATURE 3: Should create quotation with remarks (ordered)', async () => {
    const quotation = await prisma.quotation.create({
      data: {
        quotationId: `QTN-REMARKS-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Jl. Test No. 123',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        productionDate: new Date(),
        billTo: 'Test Client',
        billingName: 'Test Billing',
        billingBankName: 'Bank BCA',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'data:image/png;base64,test',
        pph: '2',
        totalAmount: 10000000,
        remarks: {
          create: [
            { text: 'First remark - high priority', isCompleted: false, order: 0 },
            { text: 'Second remark - medium', isCompleted: false, order: 1 },
            { text: 'Third remark - completed', isCompleted: true, order: 2 }
          ]
        }
      },
      include: {
        remarks: { orderBy: { order: 'asc' } }
      }
    })

    // Verify remarks in correct order
    expect(quotation.remarks.length).toBe(3)
    expect(quotation.remarks[0].text).toBe('First remark - high priority')
    expect(quotation.remarks[0].order).toBe(0)
    expect(quotation.remarks[0].isCompleted).toBe(false)
    
    expect(quotation.remarks[2].text).toBe('Third remark - completed')
    expect(quotation.remarks[2].isCompleted).toBe(true)

    // Cleanup
    await prisma.quotation.delete({ where: { id: quotation.id } })
  })

  it('FEATURE 4: Should create quotation with custom signatures (multiple)', async () => {
    const quotation = await prisma.quotation.create({
      data: {
        quotationId: `QTN-SIGS-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Jl. Test No. 123',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        productionDate: new Date(),
        billTo: 'Test Client',
        billingName: 'Test Billing',
        billingBankName: 'Bank BCA',
        billingBankAccount: '1234567890',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'data:image/png;base64,test',
        pph: '2',
        totalAmount: 10000000,
        signatures: {
          create: [
            { name: 'John Doe', position: 'CEO', imageData: '', order: 0 },
            { name: 'Jane Smith', position: 'CFO', imageData: '', order: 1 },
            { name: '_______________', position: 'Client', imageData: '', order: 2 }
          ]
        }
      },
      include: {
        signatures: { orderBy: { order: 'asc' } }
      }
    })

    // Verify custom signatures
    expect(quotation.signatures.length).toBe(3)
    expect(quotation.signatures[0].name).toBe('John Doe')
    expect(quotation.signatures[0].position).toBe('CEO')
    expect(quotation.signatures[2].name).toBe('_______________') // Empty signature for client

    // Cleanup
    await prisma.quotation.delete({ where: { id: quotation.id } })
  })

  it('FEATURE 5: Should update quotation - change basic fields', async () => {
    // Create first
    const original = await prisma.quotation.create({
      data: {
        quotationId: `QTN-UPDATE-${Date.now()}`,
        companyName: 'Old Company',
        companyAddress: 'Old Address',
        companyCity: 'Old City',
        companyProvince: 'Old Province',
        productionDate: new Date('2024-01-01'),
        billTo: 'Old Client',
        billingName: 'Old Billing',
        billingBankName: 'Old Bank',
        billingBankAccount: '111111',
        billingBankAccountName: 'Old Account',
        signatureName: 'Old Signature',
        signatureImageData: 'old',
        pph: '2',
        totalAmount: 10000000,
        status: 'draft'
      }
    })

    // Update it
    const updated = await prisma.quotation.update({
      where: { id: original.id },
      data: {
        companyName: 'New Company',
        companyAddress: 'New Address',
        billTo: 'New Client',
        totalAmount: 15000000,
        status: 'pending'
      }
    })

    // Verify changes
    expect(updated.companyName).toBe('New Company')
    expect(updated.companyAddress).toBe('New Address')
    expect(updated.billTo).toBe('New Client')
    expect(updated.totalAmount).toBe(15000000)
    expect(updated.status).toBe('pending')

    // Verify unchanged fields
    expect(updated.quotationId).toBe(original.quotationId)
    expect(updated.pph).toBe('2')

    // Cleanup
    await prisma.quotation.delete({ where: { id: original.id } })
  })

  it('FEATURE 6: Should update quotation - UPSERT items (add, update, delete)', async () => {
    // Create with 2 items
    const original = await prisma.quotation.create({
      data: {
        quotationId: `QTN-UPSERT-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test Address',
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
              productName: 'Item 1',
              total: 5000000,
              order: 0,
              details: {
                create: [{ detail: 'Detail 1', unitPrice: 5000000, qty: 1, amount: 5000000 }]
              }
            },
            {
              productName: 'Item 2',
              total: 5000000,
              order: 1,
              details: {
                create: [{ detail: 'Detail 2', unitPrice: 5000000, qty: 1, amount: 5000000 }]
              }
            }
          ]
        }
      },
      include: { items: { include: { details: true } } }
    })

    const item1Id = original.items[0].id
    const item2Id = original.items[1].id

    // UPSERT: Update item 1, delete item 2, create item 3
    await prisma.$transaction(async (tx) => {
      // Update item 1
      await tx.quotationItem.update({
        where: { id: item1Id },
        data: { productName: 'Updated Item 1', total: 6000000 }
      })

      // Delete item 2's details then item 2
      await tx.quotationItemDetail.deleteMany({ where: { quotationItemId: item2Id } })
      await tx.quotationItem.delete({ where: { id: item2Id } })

      // Create item 3
      await tx.quotationItem.create({
        data: {
          quotationId: original.id,
          productName: 'New Item 3',
          total: 4000000,
          order: 2,
          details: {
            create: [{ detail: 'Detail 3', unitPrice: 4000000, qty: 1, amount: 4000000 }]
          }
        }
      })
    })

    // Verify
    const result = await prisma.quotation.findUnique({
      where: { id: original.id },
      include: { items: { include: { details: true } } }
    })

    expect(result?.items.length).toBe(2) // Item 1 + Item 3
    expect(result?.items.find(i => i.productName === 'Updated Item 1')).toBeTruthy()
    expect(result?.items.find(i => i.productName === 'New Item 3')).toBeTruthy()
    expect(result?.items.find(i => i.productName === 'Item 2')).toBeFalsy() // Deleted

    // Cleanup
    await prisma.quotation.delete({ where: { id: original.id } })
  })

  it('FEATURE 7: Should update quotation - reorder items and remarks', async () => {
    const original = await prisma.quotation.create({
      data: {
        quotationId: `QTN-REORDER-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test Address',
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
            { productName: 'Item A', total: 1000000, order: 0 },
            { productName: 'Item B', total: 2000000, order: 1 },
            { productName: 'Item C', total: 3000000, order: 2 }
          ]
        },
        remarks: {
          create: [
            { text: 'Remark 1', isCompleted: false, order: 0 },
            { text: 'Remark 2', isCompleted: false, order: 1 }
          ]
        }
      },
      include: {
        items: { orderBy: { order: 'asc' } },
        remarks: { orderBy: { order: 'asc' } }
      }
    })

    // Reorder: C, A, B (swap order)
    const itemA = original.items.find(i => i.productName === 'Item A')!
    const itemB = original.items.find(i => i.productName === 'Item B')!
    const itemC = original.items.find(i => i.productName === 'Item C')!

    await prisma.$transaction([
      prisma.quotationItem.update({ where: { id: itemC.id }, data: { order: 0 } }),
      prisma.quotationItem.update({ where: { id: itemA.id }, data: { order: 1 } }),
      prisma.quotationItem.update({ where: { id: itemB.id }, data: { order: 2 } })
    ])

    // Verify new order
    const result = await prisma.quotation.findUnique({
      where: { id: original.id },
      include: { items: { orderBy: { order: 'asc' } } }
    })

    expect(result?.items[0].productName).toBe('Item C')
    expect(result?.items[1].productName).toBe('Item A')
    expect(result?.items[2].productName).toBe('Item B')

    // Cleanup
    await prisma.quotation.delete({ where: { id: original.id } })
  })

  it('FEATURE 8: Should change quotation status (draft → pending → accepted)', async () => {
    const quotation = await prisma.quotation.create({
      data: {
        quotationId: `QTN-STATUS-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test Address',
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

    expect(quotation.status).toBe('draft')

    // Change to pending
    const pending = await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: 'pending' }
    })
    expect(pending.status).toBe('pending')

    // Change to accepted
    const accepted = await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: 'accepted' }
    })
    expect(accepted.status).toBe('accepted')

    // Cleanup
    await prisma.quotation.delete({ where: { id: quotation.id } })
  })

  it('FEATURE 9: Should delete quotation with all related data (cascade)', async () => {
    // Create quotation with items, details, remarks, signatures
    const quotation = await prisma.quotation.create({
      data: {
        quotationId: `QTN-DELETE-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test Address',
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
            productName: 'Item',
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
          create: { name: 'Signature', position: 'CEO', imageData: '', order: 0 }
        }
      },
      include: {
        items: { include: { details: true } },
        remarks: true,
        signatures: true
      }
    })

    const itemId = quotation.items[0].id
    const detailId = quotation.items[0].details[0].id
    const remarkId = quotation.remarks[0].id
    const signatureId = quotation.signatures[0].id

    // Delete quotation (should cascade)
    await prisma.quotation.delete({ where: { id: quotation.id } })

    // Verify all related data deleted
    const item = await prisma.quotationItem.findUnique({ where: { id: itemId } })
    const detail = await prisma.quotationItemDetail.findUnique({ where: { id: detailId } })
    const remark = await prisma.quotationRemark.findUnique({ where: { id: remarkId } })
    const signature = await prisma.quotationSignature.findUnique({ where: { id: signatureId } })

    expect(item).toBeNull()
    expect(detail).toBeNull()
    expect(remark).toBeNull()
    expect(signature).toBeNull()
  })

  it('FEATURE 10: Should handle PPH calculations (different rates)', async () => {
    // Test PPH 0%
    const pph0 = await prisma.quotation.create({
      data: {
        quotationId: `QTN-PPH0-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test',
        companyCity: 'Jakarta',
        companyProvince: 'DKI',
        productionDate: new Date(),
        billTo: 'Client',
        billingName: 'Billing',
        billingBankName: 'Bank',
        billingBankAccount: '123',
        billingBankAccountName: 'Account',
        signatureName: 'Sig',
        signatureImageData: 'test',
        pph: '0',
        totalAmount: 10000000 // No PPH, total = subtotal
      }
    })
    expect(pph0.pph).toBe('0')
    expect(pph0.totalAmount).toBe(10000000)

    // Test PPH 2%
    const pph2 = await prisma.quotation.create({
      data: {
        quotationId: `QTN-PPH2-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test',
        companyCity: 'Jakarta',
        companyProvince: 'DKI',
        productionDate: new Date(),
        billTo: 'Client',
        billingName: 'Billing',
        billingBankName: 'Bank',
        billingBankAccount: '123',
        billingBankAccountName: 'Account',
        signatureName: 'Sig',
        signatureImageData: 'test',
        pph: '2',
        totalAmount: 11020408.16 // 10.8M subtotal + 2% PPH
      }
    })
    expect(pph2.pph).toBe('2')
    expect(pph2.totalAmount).toBeCloseTo(11020408.16, 2)

    // Cleanup
    await prisma.quotation.deleteMany({
      where: { quotationId: { startsWith: 'QTN-PPH' } }
    })
  })

  it('FEATURE 11: Should handle custom summary order', async () => {
    // Test default order
    const default1 = await prisma.quotation.create({
      data: {
        quotationId: `QTN-SUM1-${Date.now()}`,
        companyName: 'Test',
        companyAddress: 'Test',
        companyCity: 'Jakarta',
        companyProvince: 'DKI',
        productionDate: new Date(),
        billTo: 'Client',
        billingName: 'Billing',
        billingBankName: 'Bank',
        billingBankAccount: '123',
        billingBankAccountName: 'Account',
        signatureName: 'Sig',
        signatureImageData: 'test',
        pph: '2',
        totalAmount: 10000000,
        summaryOrder: 'subtotal,pph,total' // Default
      }
    })
    expect(default1.summaryOrder).toBe('subtotal,pph,total')

    // Test custom order
    const custom = await prisma.quotation.create({
      data: {
        quotationId: `QTN-SUM2-${Date.now()}`,
        companyName: 'Test',
        companyAddress: 'Test',
        companyCity: 'Jakarta',
        companyProvince: 'DKI',
        productionDate: new Date(),
        billTo: 'Client',
        billingName: 'Billing',
        billingBankName: 'Bank',
        billingBankAccount: '123',
        billingBankAccountName: 'Account',
        signatureName: 'Sig',
        signatureImageData: 'test',
        pph: '2',
        totalAmount: 10000000,
        summaryOrder: 'total,pph,subtotal' // Custom order
      }
    })
    expect(custom.summaryOrder).toBe('total,pph,subtotal')

    // Cleanup
    await prisma.quotation.deleteMany({
      where: { quotationId: { startsWith: 'QTN-SUM' } }
    })
  })

  it('FEATURE 12: Should handle optional fields (null values)', async () => {
    const quotation = await prisma.quotation.create({
      data: {
        quotationId: `QTN-NULL-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test Address',
        companyCity: 'Jakarta',
        companyProvince: 'DKI Jakarta',
        productionDate: new Date(),
        billTo: 'Test Client',
        // Optional fields as null
        companyPostalCode: null,
        companyTelp: null,
        companyEmail: null,
        billToEmail: null,
        notes: null,
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

    // Verify null fields accepted
    expect(quotation.companyPostalCode).toBeNull()
    expect(quotation.companyTelp).toBeNull()
    expect(quotation.companyEmail).toBeNull()
    expect(quotation.notes).toBeNull()
    expect(quotation.billingKtp).toBeNull()
    expect(quotation.termsAndConditions).toBeNull()

    // Cleanup
    await prisma.quotation.delete({ where: { id: quotation.id } })
  })
})
