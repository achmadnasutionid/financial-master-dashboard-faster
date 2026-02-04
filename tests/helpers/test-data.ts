/**
 * Test Data Helpers
 * Create realistic test data for all critical features
 */

export const createTestCompany = () => ({
  name: `Test Company ${Date.now()}`,
  address: 'Jl. Test No. 123',
  city: 'Jakarta',
  province: 'DKI Jakarta',
  postalCode: '12345',
  telp: '021-12345678',
  email: 'test@company.com'
})

export const createTestBilling = () => ({
  name: `Test Billing ${Date.now()}`,
  bankName: 'Bank Test',
  bankAccount: '1234567890',
  bankAccountName: 'Test Account',
  ktp: '1234567890123456',
  npwp: '12.345.678.9-012.345'
})

export const createTestSignature = () => ({
  name: `Test Signature ${Date.now()}`,
  role: 'Director',
  imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
})

export const createTestQuotation = (companyId: string, billingId: string, signatureId: string) => ({
  companyName: 'Test Company',
  companyAddress: 'Jl. Test No. 123',
  companyCity: 'Jakarta',
  companyProvince: 'DKI Jakarta',
  companyPostalCode: '12345',
  companyTelp: '021-12345678',
  companyEmail: 'test@company.com',
  productionDate: new Date().toISOString(),
  billTo: 'Test Client',
  billToEmail: 'client@test.com',
  notes: 'Test notes',
  billingName: 'Test Billing',
  billingBankName: 'Bank Test',
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
  termsAndConditions: 'Test terms',
  status: 'draft',
  items: [
    {
      productName: 'Test Product 1',
      total: 5000000,
      details: [
        {
          detail: 'Test Detail 1',
          unitPrice: 1000000,
          qty: 5,
          amount: 5000000
        }
      ]
    },
    {
      productName: 'Test Product 2',
      total: 5800000,
      details: [
        {
          detail: 'Test Detail 2',
          unitPrice: 2900000,
          qty: 2,
          amount: 5800000
        }
      ]
    }
  ],
  remarks: [
    { text: 'Test remark 1', isCompleted: false },
    { text: 'Test remark 2', isCompleted: false }
  ],
  customSignatures: []
})

export const createTestPlanning = () => ({
  projectName: `Test Project ${Date.now()}`,
  clientName: 'Test Client',
  clientBudget: 10000000,
  notes: 'Test planning notes',
  status: 'draft',
  items: [
    {
      productName: 'Item 1',
      budget: 5000000,
      expense: 4500000
    },
    {
      productName: 'Item 2',
      budget: 5000000,
      expense: 5200000
    }
  ]
})

export const createTestExpense = () => ({
  projectName: `Test Expense ${Date.now()}`,
  productionDate: new Date().toISOString(),
  clientBudget: 10000000,
  paidAmount: 9500000,
  totalItemBudgeted: 10000000,
  totalItemDifferences: -500000,
  notes: 'Test expense notes',
  status: 'draft',
  items: [
    {
      productName: 'Item 1',
      budgeted: 5000000,
      actual: 4800000,
      difference: 200000
    },
    {
      productName: 'Item 2',
      budgeted: 5000000,
      actual: 5200000,
      difference: -200000
    }
  ]
})
