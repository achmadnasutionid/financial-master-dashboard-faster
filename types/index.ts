/**
 * Type definitions for the Financial Master Dashboard
 */

// ============================================================================
// Core Entity Types
// ============================================================================

export interface Company {
  id: string
  name: string
  address: string
  city: string
  province: string
  postalCode: string | null
  telp: string | null
  email: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Billing {
  id: string
  name: string
  bankName: string
  bankAccount: string
  bankAccountName: string
  ktp: string | null
  npwp: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Signature {
  id: string
  name: string
  role: string | null
  imageData: string
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Transaction Types
// ============================================================================

export type DocumentStatus = 'draft' | 'pending' | 'accepted' | 'paid' | 'final'

export interface Invoice {
  id: string
  invoiceId: string
  planningId: string | null
  companyName: string
  companyAddress: string
  companyCity: string
  companyProvince: string
  companyPostalCode: string | null
  companyTelp: string | null
  companyEmail: string | null
  productionDate: Date
  billTo: string
  notes: string | null
  billingName: string
  billingBankName: string
  billingBankAccount: string
  billingBankAccountName: string
  billingKtp: string | null
  billingNpwp: string | null
  signatureName: string
  signatureRole: string | null
  signatureImageData: string
  pph: string
  totalAmount: number
  status: DocumentStatus
  generatedExpenseId: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceSignature {
  id: string
  invoiceId: string
  name: string
  position: string
  imageData: string
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface Quotation {
  id: string
  quotationId: string
  companyName: string
  companyAddress: string
  companyCity: string
  companyProvince: string
  companyPostalCode: string | null
  companyTelp: string | null
  companyEmail: string | null
  productionDate: Date
  billTo: string
  notes: string | null
  billingName: string
  billingBankName: string
  billingBankAccount: string
  billingBankAccountName: string
  billingKtp: string | null
  billingNpwp: string | null
  signatureName: string
  signatureRole: string | null
  signatureImageData: string
  pph: string
  totalAmount: number
  status: DocumentStatus
  generatedInvoiceId: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface QuotationSignature {
  id: string
  quotationId: string
  name: string
  position: string
  imageData: string
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface ExpenseItem {
  id: string
  expenseId: string
  productName: string
  budgeted: number
  actual: number
  difference: number
  createdAt: Date
  updatedAt: Date
}

export interface Expense {
  id: string
  expenseId: string
  invoiceId: string | null
  planningId: string | null
  // Snapshot fields (no FK relationships)
  invoiceNumber: string | null
  invoiceProductionDate: Date | null
  invoiceTotalAmount: number | null
  invoicePaidDate: Date | null
  planningNumber: string | null
  planningClientName: string | null
  // Expense data
  projectName: string
  productionDate: Date
  clientBudget: number
  paidAmount: number
  totalItemBudgeted: number
  totalItemDifferences: number
  notes: string | null
  status: DocumentStatus
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  items: ExpenseItem[]
}

export interface Planning {
  id: string
  planningId: string
  projectName: string
  clientName: string
  clientBudget: number
  notes: string | null
  status: DocumentStatus
  generatedQuotationId: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface GearExpense {
  id: string
  name: string
  amount: number
  date: Date | null
  year: number
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface BigExpense {
  id: string
  name: string
  amount: number
  date: Date | null
  year: number
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Dashboard Statistics Types
// ============================================================================

export interface InvoiceStats {
  total: number
  draft: number
  pending: number
  paid: number
}

export interface QuotationStats {
  total: number
  draft: number
  pending: number
  accepted: number
}

export interface ExpenseStats {
  totalUnderBudget: number
  totalOverBudget: number
  averageEfficiency: number
  grossProfit: number
  netProfit: number
  marginPercentage: number
}

export interface ExtraExpenses {
  gearTotal: number
  bigTotal: number
}

export interface MonthlyTrend {
  month: string
  grossProfit: number
  netProfit: number
  underBudget: number
  overBudget: number
  projectCount: number
  totalInvoiceValue: number
  profitMargin: number
  averageValue: number
}

export interface ProductExpense {
  name: string
  amount: number
  percentage: number
}

export interface ActionItems {
  pendingInvoices: {
    count: number
    totalAmount: number
    items: Invoice[]
  }
  pendingQuotations: {
    count: number
    items: (Quotation & { daysSinceUpdate: number })[]
  }
  draftExpenses: {
    count: number
  }
}

export type ActivityType = 'invoice' | 'quotation' | 'expense' | 'planning'
export type ActivityIcon = 'receipt' | 'file-check' | 'wallet' | 'calendar'
export type ActivityColor = 'green' | 'blue' | 'yellow' | 'orange' | 'gray'

export interface RecentActivity {
  type: ActivityType
  id: string
  displayId: string
  action: string
  timestamp: number
  date: string
  icon: ActivityIcon
  color: ActivityColor
}

export interface ThisMonthSummary {
  revenue: number
  netProfit: number
  revenueChange: number
  profitChange: number
}

// ============================================================================
// Dashboard Card Types
// ============================================================================

export interface DashboardCard {
  id: string
  section: 'Quick Action' | 'Special Case' | 'Management'
  title: string
  keywords: string
  route: string
  icon: string
}

// ============================================================================
// API Response Types
// ============================================================================

export interface DashboardStatsResponse {
  invoices: Invoice[]
  quotations: Quotation[]
  expenses: Expense[]
  products: Product[]
  gearExpenses: GearExpense[]
  bigExpenses: BigExpense[]
  planning: Planning[]
  timestamp: string
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface YearSelectProps {
  selectedYear: string
  onYearChange: (year: string) => void
  availableYears: number[]
  className?: string
}

export interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  onClick?: () => void
  className?: string
  valueClassName?: string
}

export interface TrendChartProps {
  data: MonthlyTrend[]
  loading?: boolean
}

export interface ProductChartProps {
  products: ProductExpense[]
  showAll: boolean
  onToggleShowAll: () => void
  loading?: boolean
}
