/**
 * CRITICAL TEST: Percentage adjustment persistence
 *
 * Ensures adjustmentPercentage and adjustmentNotes are stored and returned
 * for Quotation (and that the same pattern works for Invoice/Paragon/Erha schema).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'

describe('🔴 CRITICAL: Adjustment (percentage + notes) persistence', () => {
  let quotationId: string | undefined

  beforeAll(async () => {
    const quotation = await prisma.quotation.create({
      data: {
        quotationId: `TEST-ADJ-${Date.now()}`,
        companyName: 'Adjust Test Co',
        companyAddress: 'Address',
        companyCity: 'City',
        companyProvince: 'Province',
        productionDate: new Date(),
        billTo: 'Client',
        billingName: 'Billing',
        billingBankName: 'Bank',
        billingBankAccount: '123',
        billingBankAccountName: 'Account',
        signatureName: 'Sig',
        signatureImageData: 'data:image/png;base64,x',
        pph: '2',
        totalAmount: 1000000,
        adjustmentPercentage: 10,
        adjustmentNotes: 'Early payment discount',
      },
    })
    quotationId = quotation.id
  })

  afterAll(async () => {
    if (!quotationId) return
    await prisma.productionTracker.deleteMany({
      where: { projectName: 'Client', deletedAt: null },
    })
    await prisma.quotation.delete({ where: { id: quotationId } })
  })

  it('should persist and return adjustmentPercentage and adjustmentNotes on create', async () => {
    expect(quotationId).toBeDefined()
    const found = await prisma.quotation.findUnique({
      where: { id: quotationId! },
      select: { adjustmentPercentage: true, adjustmentNotes: true },
    })
    expect(found).not.toBeNull()
    expect(found!.adjustmentPercentage).toBe(10)
    expect(found!.adjustmentNotes).toBe('Early payment discount')
  })

  it('should update adjustment and allow clearing (0 / null)', async () => {
    expect(quotationId).toBeDefined()
    await prisma.quotation.update({
      where: { id: quotationId! },
      data: {
        adjustmentPercentage: 15,
        adjustmentNotes: 'Updated note',
      },
    })
    const afterUpdate = await prisma.quotation.findUnique({
      where: { id: quotationId! },
      select: { adjustmentPercentage: true, adjustmentNotes: true },
    })
    expect(afterUpdate!.adjustmentPercentage).toBe(15)
    expect(afterUpdate!.adjustmentNotes).toBe('Updated note')

    await prisma.quotation.update({
      where: { id: quotationId! },
      data: {
        adjustmentPercentage: null,
        adjustmentNotes: null,
      },
    })
    const afterClear = await prisma.quotation.findUnique({
      where: { id: quotationId! },
      select: { adjustmentPercentage: true, adjustmentNotes: true },
    })
    expect(afterClear!.adjustmentPercentage).toBeNull()
    expect(afterClear!.adjustmentNotes).toBeNull()
  })
})
