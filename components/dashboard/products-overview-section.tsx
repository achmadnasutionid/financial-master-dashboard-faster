import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import type { ProductExpense } from "@/types"

interface ProductsOverviewSectionProps {
  products: ProductExpense[]
  etcExpenses: ProductExpense[]
  showAllProducts: boolean
  onToggleShowAll: () => void
  selectedYear: string
  availableYears: number[]
  onYearChange: (year: string) => void
  loading: boolean
  onNavigate: (path: string) => void
}

export function ProductsOverviewSection({
  products,
  etcExpenses,
  showAllProducts,
  onToggleShowAll,
  selectedYear,
  availableYears,
  onYearChange,
  loading,
  onNavigate,
}: ProductsOverviewSectionProps) {
  const getLeastExpense = () => {
    // Start from the end (least) and find first non-PHOTOGRAPHER product
    for (let i = products.length - 1; i >= 0; i--) {
      if (products[i].name.toUpperCase() !== "PHOTOGRAPHER") {
        return products[i]
      }
    }
    return null
  }

  const leastExpense = getLeastExpense()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">
            Products Overview
          </h2>
        </div>
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
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Master Products Cards and Chart */}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Most Expense Card */}
                <Card
                  className={`border-2 ${
                    products[0] ? "border-blue-200" : "border-transparent"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <CardTitle
                      className={`text-sm font-medium text-muted-foreground ${
                        !products[0] && "invisible"
                      }`}
                    >
                      Most Expense
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={!products[0] ? "invisible" : ""}>
                    {products[0] ? (
                      <>
                        <div className="text-2xl sm:text-3xl font-bold text-blue-600 break-words">
                          Rp {Math.round(products[0].amount)} Juta
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {products[0].name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {products[0].percentage.toFixed(1)}% of total
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold">Placeholder</div>
                        <p className="text-sm mt-1">Placeholder</p>
                        <p className="text-xs mt-1">Placeholder</p>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Least Expense Card */}
                <Card
                  className={`border-2 ${
                    leastExpense ? "border-green-200" : "border-transparent"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <CardTitle
                      className={`text-sm font-medium text-muted-foreground ${
                        !leastExpense && "invisible"
                      }`}
                    >
                      Least Expense
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={!leastExpense ? "invisible" : ""}>
                    {leastExpense ? (
                      <>
                        <div className="text-2xl sm:text-3xl font-bold text-green-600 break-words">
                          Rp {Math.round(leastExpense.amount)} Juta
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {leastExpense.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {leastExpense.percentage.toFixed(1)}% of total
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold">Placeholder</div>
                        <p className="text-sm mt-1">Placeholder</p>
                        <p className="text-xs mt-1">Placeholder</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Master Products Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Master Products Expenses
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Top expenses from master product data (Juta Rupiah)
                  </p>
                </CardHeader>
                <CardContent>
                  {products.length > 0 ? (
                    <ResponsiveContainer
                      width="100%"
                      height={
                        showAllProducts
                          ? Math.max(400, products.length * 50)
                          : 400
                      }
                    >
                      <BarChart
                        data={
                          showAllProducts ? products : products.slice(0, 5)
                        }
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={150} />
                        <Tooltip
                          formatter={(value, _name, props: any) => [
                            `Rp ${Number(value).toFixed(0)} Juta (${props.payload.percentage.toFixed(0)}%)`,
                            "Amount",
                          ]}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "1px solid #ccc",
                          }}
                        />
                        <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                          {(showAllProducts
                            ? products
                            : products.slice(0, 5)
                          ).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="#2563eb" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      No master products expenses found
                    </div>
                  )}
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onToggleShowAll}
                      className={products.length <= 5 ? "invisible" : ""}
                    >
                      {showAllProducts
                        ? "Show Less"
                        : `See More (${products.length - 5} more)`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ETC Items Cards and Chart */}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* First Most ETC Expense Card */}
                <Card
                  className={`border-2 ${
                    etcExpenses[0]
                      ? "border-red-200 cursor-pointer hover:shadow-lg transition-all"
                      : "border-transparent"
                  }`}
                  onClick={
                    etcExpenses[0]
                      ? () => {
                          sessionStorage.setItem(
                            "newProductName",
                            etcExpenses[0].name
                          )
                          sessionStorage.setItem("fromLanding", "true")
                          onNavigate("/products?action=create")
                        }
                      : undefined
                  }
                  title={
                    etcExpenses[0]
                      ? "Click to add this to product master"
                      : undefined
                  }
                >
                  <CardHeader className="pb-3">
                    <CardTitle
                      className={`text-sm font-medium text-muted-foreground ${
                        !etcExpenses[0] && "invisible"
                      }`}
                    >
                      1st Most ETC Expense
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={!etcExpenses[0] ? "invisible" : ""}>
                    {etcExpenses[0] ? (
                      <>
                        <div className="text-2xl sm:text-3xl font-bold text-red-600 break-words">
                          Rp {Math.round(etcExpenses[0].amount)} Juta
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {etcExpenses[0].name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {etcExpenses[0].percentage.toFixed(1)}% of ETC total
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold">Placeholder</div>
                        <p className="text-sm mt-1">Placeholder</p>
                        <p className="text-xs mt-1">Placeholder</p>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Second Most ETC Expense Card */}
                <Card
                  className={`border-2 ${
                    etcExpenses[1]
                      ? "border-orange-200 cursor-pointer hover:shadow-lg transition-all"
                      : "border-transparent"
                  }`}
                  onClick={
                    etcExpenses[1]
                      ? () => {
                          sessionStorage.setItem(
                            "newProductName",
                            etcExpenses[1].name
                          )
                          sessionStorage.setItem("fromLanding", "true")
                          onNavigate("/products?action=create")
                        }
                      : undefined
                  }
                  title={
                    etcExpenses[1]
                      ? "Click to add this to product master"
                      : undefined
                  }
                >
                  <CardHeader className="pb-3">
                    <CardTitle
                      className={`text-sm font-medium text-muted-foreground ${
                        !etcExpenses[1] && "invisible"
                      }`}
                    >
                      2nd Most ETC Expense
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={!etcExpenses[1] ? "invisible" : ""}>
                    {etcExpenses[1] ? (
                      <>
                        <div className="text-2xl sm:text-3xl font-bold text-orange-600 break-words">
                          Rp {Math.round(etcExpenses[1].amount)} Juta
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {etcExpenses[1].name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {etcExpenses[1].percentage.toFixed(1)}% of ETC total
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold">Placeholder</div>
                        <p className="text-sm mt-1">Placeholder</p>
                        <p className="text-xs mt-1">Placeholder</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* ETC Items Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ETC Items Expenses</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Top 5 manually entered items (Juta Rupiah)
                  </p>
                </CardHeader>
                <CardContent>
                  {etcExpenses.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={etcExpenses.slice(0, 5)}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={150} />
                        <Tooltip
                          formatter={(value, _name, props: any) => [
                            `Rp ${Number(value).toFixed(0)} Juta (${props.payload.percentage.toFixed(0)}%)`,
                            "Amount",
                          ]}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "1px solid #ccc",
                          }}
                        />
                        <Bar
                          dataKey="amount"
                          fill="#dc2626"
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      No ETC items found
                    </div>
                  )}
                  <div className="mt-4 text-center">
                    <Button variant="outline" size="sm" className="invisible">
                      Placeholder
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
