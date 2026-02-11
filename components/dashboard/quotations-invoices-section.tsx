import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { InvoiceStats, QuotationStats } from "@/types"

interface QuotationsInvoicesSectionProps {
  invoiceStats: InvoiceStats
  quotationStats: QuotationStats
  selectedYear: string
  availableYears: number[]
  onYearChange: (year: string) => void
  loading: boolean
  formatCurrency: (amount: number) => string
  onNavigate: (path: string) => void
  hideYearFilter?: boolean
}

export function QuotationsInvoicesSection({
  invoiceStats,
  quotationStats,
  selectedYear,
  availableYears,
  onYearChange,
  loading,
  formatCurrency,
  onNavigate,
  hideYearFilter = false,
}: QuotationsInvoicesSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">
            Quotations & Invoices
          </h2>
        </div>
        {!hideYearFilter && (
          <Select value={selectedYear} onValueChange={onYearChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-8 w-16 bg-muted rounded mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Quotations Card */}
          <Card
            className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
            onClick={() => onNavigate("/quotation")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Quotations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-primary break-words">
                {formatCurrency(quotationStats.total)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total value (excl. drafts)
              </p>
            </CardContent>
          </Card>

          {/* Pending Quotations Card */}
          <Card
            className="group cursor-pointer transition-all hover:shadow-lg hover:border-blue-500/50"
            onClick={() => onNavigate("/quotation?status=pending")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Quotations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-[hsl(199_89%_48%)] break-words">
                {formatCurrency(quotationStats.pending)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting acceptance
              </p>
            </CardContent>
          </Card>

          {/* Accepted Quotations Card */}
          <Card
            className="group cursor-pointer transition-all hover:shadow-lg hover:border-green-500/50"
            onClick={() => onNavigate("/quotation?status=accepted")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Accepted Quotations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-[hsl(142_76%_36%)] break-words">
                {formatCurrency(quotationStats.accepted)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Completed</p>
            </CardContent>
          </Card>

          {/* Total Invoices Card */}
          <Card
            className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
            onClick={() => onNavigate("/invoice")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-primary break-words">
                {formatCurrency(invoiceStats.total)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total value (excl. drafts)
              </p>
            </CardContent>
          </Card>

          {/* Pending Invoices Card */}
          <Card
            className="group cursor-pointer transition-all hover:shadow-lg hover:border-blue-500/50"
            onClick={() => onNavigate("/invoice?status=pending")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-[hsl(199_89%_48%)] break-words">
                {formatCurrency(invoiceStats.pending)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting payment
              </p>
            </CardContent>
          </Card>

          {/* Paid Invoices Card */}
          <Card
            className="group cursor-pointer transition-all hover:shadow-lg hover:border-green-500/50"
            onClick={() => onNavigate("/invoice?status=paid")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paid Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-[hsl(142_76%_36%)] break-words">
                {formatCurrency(invoiceStats.paid)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Completed</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
