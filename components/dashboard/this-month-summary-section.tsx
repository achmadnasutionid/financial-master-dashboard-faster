import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, ArrowUp, ArrowDown, Minus } from "lucide-react"
import type { ThisMonthSummary } from "@/types"

interface ThisMonthSummarySectionProps {
  summary: ThisMonthSummary
  loading: boolean
  formatCurrency: (amount: number) => string
}

export function ThisMonthSummarySection({
  summary,
  loading,
  formatCurrency,
}: ThisMonthSummarySectionProps) {
  if (loading) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold tracking-tight">This Month Summary</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Revenue Card */}
        <Card>
          <CardContent className="py-3">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">
                Revenue
              </p>
              <p className="text-xl font-bold">
                {formatCurrency(summary.revenue)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Total paid invoices this month
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Comparison Card */}
        <Card>
          <CardContent className="py-3">
            <div className="space-y-0.5 flex flex-col items-end">
              <p className="text-xs font-medium text-muted-foreground">
                Revenue Change
              </p>
              <div
                className={`flex items-center gap-1 ${
                  summary.revenueChange > 0
                    ? "text-green-600"
                    : summary.revenueChange < 0
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {summary.revenueChange > 0 && <ArrowUp className="h-4 w-4" />}
                {summary.revenueChange < 0 && <ArrowDown className="h-4 w-4" />}
                {summary.revenueChange === 0 && <Minus className="h-4 w-4" />}
                <span className="text-xl font-bold">
                  {Math.abs(summary.revenueChange).toFixed(0)}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {summary.revenueChange > 0
                  ? "increase"
                  : summary.revenueChange < 0
                  ? "decrease"
                  : "no change"}{" "}
                vs last month
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit Card */}
        <Card>
          <CardContent className="py-3">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">
                Net Profit
              </p>
              <p
                className={`text-xl font-bold ${
                  summary.netProfit >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(summary.netProfit)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Paid - Actual expenses
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit Comparison Card */}
        <Card>
          <CardContent className="py-3">
            <div className="space-y-0.5 flex flex-col items-end">
              <p className="text-xs font-medium text-muted-foreground">
                Profit Change
              </p>
              <div
                className={`flex items-center gap-1 ${
                  summary.profitChange > 0
                    ? "text-green-600"
                    : summary.profitChange < 0
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {summary.profitChange > 0 && <ArrowUp className="h-4 w-4" />}
                {summary.profitChange < 0 && <ArrowDown className="h-4 w-4" />}
                {summary.profitChange === 0 && <Minus className="h-4 w-4" />}
                <span className="text-xl font-bold">
                  {Math.abs(summary.profitChange).toFixed(0)}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {summary.profitChange > 0
                  ? "increase"
                  : summary.profitChange < 0
                  ? "decrease"
                  : "no change"}{" "}
                vs last month
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
