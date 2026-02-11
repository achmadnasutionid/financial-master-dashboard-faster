import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import type { MonthlyTrend } from "@/types"

interface FinancialTrendsSectionProps {
  trends: MonthlyTrend[]
  selectedYear: string
  availableYears: number[]
  onYearChange: (year: string) => void
  loading: boolean
  hideYearFilter?: boolean
}

export function FinancialTrendsSection({
  trends,
  selectedYear,
  availableYears,
  onYearChange,
  loading,
  hideYearFilter = false,
}: FinancialTrendsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">
            Financial Trends
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
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 w-48 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-80 bg-muted rounded" />
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 w-48 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-80 bg-muted rounded" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profit Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Gross & Net Profit Trends
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Amounts in Juta Rupiah (Millions)
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      `Rp ${Math.round(Number(value))} Juta`
                    }
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #ccc",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="grossProfit"
                    stroke="#2563eb"
                    strokeWidth={2}
                    name="Gross Profit"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netProfit"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="Net Profit"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Project Volume Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Volume Trend</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Number of completed projects per month
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => `${value} projects`}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #ccc",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="projectCount"
                    stroke="#2563eb"
                    strokeWidth={3}
                    name="Project Count"
                    dot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
