import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

/**
 * Server Component - Static Info Card
 * Use this for non-interactive display cards
 * Renders on server, reduces client-side JavaScript
 */
interface StaticCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  className?: string
}

export function StaticCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  className 
}: StaticCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
