import { Card, CardContent } from "@/components/ui/card"
import { Wallet } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ExpenseStats, ExtraExpenses } from "@/types"

interface FinancialHealthSectionProps {
  expenseStats: ExpenseStats
  extraExpenses: ExtraExpenses
  selectedYear: string
  availableYears: number[]
  onYearChange: (year: string) => void
  loading: boolean
  formatCurrency: (amount: number) => string
  hideYearFilter?: boolean
}

export function FinancialHealthSection({
  expenseStats,
  extraExpenses,
  selectedYear,
  availableYears,
  onYearChange,
  loading,
  formatCurrency,
  hideYearFilter = false,
}: FinancialHealthSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Financial Health</h2>
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
        <>
          <Card className="animate-pulse">
            <CardContent className="pt-6">
              <div className="grid gap-6 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-8 w-32 bg-muted rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="animate-pulse border-2">
            <CardContent className="pt-6">
              <div className="grid gap-6 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-8 w-32 bg-muted rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Gross Profit */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Gross Profit
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-[hsl(199_89%_48%)] break-words">
                    {formatCurrency(expenseStats.grossProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total client paid amount
                  </p>
                </div>

                {/* Net Profit */}
                <div className="space-y-2 border-l border-r px-6">
                  <p className="text-sm font-medium text-muted-foreground">
                    Net Profit
                  </p>
                  <p
                    className={`text-2xl sm:text-3xl font-bold break-words ${
                      expenseStats.netProfit >= 0
                        ? "text-[hsl(142_76%_36%)]"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(expenseStats.netProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Paid - Actual expenses
                  </p>
                </div>

                {/* Margin Percentage */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Margin
                  </p>
                  <p
                    className={`text-2xl sm:text-3xl font-bold break-words ${
                      expenseStats.marginPercentage >= 0
                        ? "text-[hsl(142_76%_36%)]"
                        : "text-red-600"
                    }`}
                  >
                    {expenseStats.marginPercentage.toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Profit margin</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extra Expenses Card */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Net Profit After Expenses */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Net Profit After Expenses
                  </p>
                  <p
                    className={`text-2xl sm:text-3xl font-bold break-words ${
                      expenseStats.netProfit -
                        extraExpenses.gearTotal -
                        extraExpenses.bigTotal >=
                      0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(
                      expenseStats.netProfit -
                        extraExpenses.gearTotal -
                        extraExpenses.bigTotal
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Net - Gear - Big expenses
                  </p>
                </div>

                {/* Gear Expenses */}
                <div className="space-y-2 border-l border-r px-6">
                  <p className="text-sm font-medium text-muted-foreground">
                    Gear Expenses
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-600 break-words">
                    {formatCurrency(extraExpenses.gearTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total gear expenses
                  </p>
                </div>

                {/* Big Expenses */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Big Expenses
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-red-600 break-words">
                    {formatCurrency(extraExpenses.bigTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total big expenses
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
