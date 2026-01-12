import { StaticCard } from "@/components/rsc/static-card"
import { ServerTable } from "@/components/rsc/server-table"
import { InfoSection } from "@/components/rsc/info-section"
import { FileText, DollarSign, TrendingUp } from "lucide-react"
import { prisma } from "@/lib/prisma"

/**
 * Server Component Example Page
 * Demonstrates RSC best practices:
 * - Fetch data on server
 * - Render static content as Server Components
 * - Only use Client Components where needed
 */
export default async function RSCExamplePage() {
  // Fetch data on the server
  const [invoices, stats] = await Promise.all([
    prisma.invoice.findMany({
      where: { deletedAt: null },
      select: {
        invoiceId: true,
        totalAmount: true,
        status: true,
        productionDate: true,
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.aggregate({
      where: { deletedAt: null, status: 'paid' },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ])

  const totalRevenue = stats._sum.totalAmount || 0
  const totalInvoices = stats._count || 0

  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        {/* Header - Server Rendered */}
        <div>
          <h1 className="text-3xl font-bold">RSC Example Dashboard</h1>
          <p className="text-muted-foreground">
            Server-rendered at: {new Date().toLocaleString()}
          </p>
        </div>

        {/* Static Cards - Server Components */}
        <div className="grid gap-6 md:grid-cols-3">
          <StaticCard
            title="Total Revenue"
            value={`Rp ${(totalRevenue / 1000000).toFixed(1)}M`}
            icon={DollarSign}
            description="From paid invoices"
          />
          
          <StaticCard
            title="Total Invoices"
            value={totalInvoices}
            icon={FileText}
            description="All time"
          />
          
          <StaticCard
            title="Average Invoice"
            value={`Rp ${totalInvoices > 0 ? ((totalRevenue / totalInvoices) / 1000000).toFixed(1) : 0}M`}
            icon={TrendingUp}
            description="Per invoice"
          />
        </div>

        {/* Info Section - Server Component */}
        <InfoSection 
          title="Recent Invoices" 
          icon={FileText}
        >
          <ServerTable
            data={invoices}
            columns={[
              {
                header: "Invoice ID",
                accessor: "invoiceId",
              },
              {
                header: "Date",
                accessor: (row) => new Date(row.productionDate).toLocaleDateString(),
              },
              {
                header: "Amount",
                accessor: (row) => `Rp ${(row.totalAmount / 1000000).toFixed(2)}M`,
                className: "text-right",
              },
              {
                header: "Status",
                accessor: (row) => (
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    row.status === 'paid' ? 'bg-green-100 text-green-800' :
                    row.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {row.status.toUpperCase()}
                  </span>
                ),
              },
            ]}
          />
        </InfoSection>

        {/* Benefits Note */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <h3 className="font-semibold text-green-900 dark:text-green-100">
            ✅ RSC Benefits on This Page:
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-green-800 dark:text-green-200">
            <li>• Data fetched on server (no client-side loading)</li>
            <li>• Static cards rendered on server (less JavaScript)</li>
            <li>• Table rendered as HTML (better SEO)</li>
            <li>• Faster initial page load</li>
            <li>• No client-side hydration for static content</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Enable ISR - regenerate every 60 seconds
export const revalidate = 60

// Optional: Dynamic metadata
export async function generateMetadata() {
  return {
    title: 'RSC Example - Financial Dashboard',
    description: 'Server-rendered dashboard example',
  }
}
