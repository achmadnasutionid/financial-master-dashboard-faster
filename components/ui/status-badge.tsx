import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusLower = status.toLowerCase()
  
  // Color mapping for elderly-friendly visual cues
  const getStatusColor = () => {
    switch (statusLower) {
      case 'paid':
      case 'accepted':
      case 'final':
      case 'completed':
        return 'bg-[hsl(142_76%_36%)] text-white' // Green for success
      
      case 'pending':
        return 'bg-[hsl(199_89%_48%)] text-white' // Blue for pending
      
      case 'draft':
        return 'bg-[hsl(38_92%_50%)] text-white' // Orange for draft/warning
      
      default:
        return 'bg-secondary text-secondary-foreground' // Gray for others
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        getStatusColor(),
        className
      )}
    >
      {status}
    </span>
  )
}
