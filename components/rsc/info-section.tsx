import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

/**
 * Server Component - Info Section with Icon
 * Use for static content sections
 * Renders on server, no client-side JavaScript needed
 */
interface InfoSectionProps {
  title: string
  icon: LucideIcon
  children: React.ReactNode
  className?: string
}

export function InfoSection({ 
  title, 
  icon: Icon, 
  children,
  className 
}: InfoSectionProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}
