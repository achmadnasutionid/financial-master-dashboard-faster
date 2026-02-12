"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface YearlyProfitSectionProps {
  grossProfit: number
  netProfit: number
  selectedYear: string
  availableYears: number[]
  onYearChange: (year: string) => void
  loading: boolean
  formatCurrency: (amount: number) => string
}

export function YearlyProfitSection({
  grossProfit,
  netProfit,
  selectedYear,
  availableYears,
  onYearChange,
  loading,
  formatCurrency,
}: YearlyProfitSectionProps) {
  const profitMargin = grossProfit > 0 ? ((netProfit / grossProfit) * 100).toFixed(1) : 0

  return (
    <div className="space-y-4">
      {/* Header with Year Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Yearly Profit</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-input bg-background text-sm"
            disabled={loading}
          >
            {availableYears.map((year) => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Profit Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Net Profit Card */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(netProfit)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  After tax, gear & big expenses
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="text-xs font-medium">Margin:</div>
                  <div className={`text-xs font-semibold ${Number(profitMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitMargin}%
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Gross Profit Card */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Gross Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(grossProfit)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total revenue from final expenses
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Before deductions
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
