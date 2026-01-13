import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Calendar,
  FileCheck,
  Receipt,
  Wallet,
  Building2,
  FileText,
  FileSignature,
  Package,
  PackageOpen,
} from "lucide-react"
import type { DashboardCard } from "@/types"

interface QuickActionSectionProps {
  cards: DashboardCard[]
  onNavigate: (path: string) => void
}

export function QuickActionSection({ cards, onNavigate }: QuickActionSectionProps) {
  if (cards.length === 0) return null

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "calendar":
        return <Calendar className="h-6 w-6 text-primary" />
      case "file-check":
        return <FileCheck className="h-6 w-6 text-primary" />
      case "receipt":
        return <Receipt className="h-6 w-6 text-primary" />
      case "wallet":
        return <Wallet className="h-6 w-6 text-primary" />
      case "building":
        return <Building2 className="h-6 w-6 text-primary" />
      case "file-text":
        return <FileText className="h-6 w-6 text-primary" />
      case "file-signature":
        return <FileSignature className="h-6 w-6 text-primary" />
      case "package":
        return <Package className="h-6 w-6 text-primary" />
      case "package-open":
        return <PackageOpen className="h-6 w-6 text-primary" />
      default:
        return <Package className="h-6 w-6 text-primary" />
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold tracking-tight">Quick Action</h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card
            key={card.id}
            className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
            onClick={() => onNavigate(card.route)}
          >
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                {getIcon(card.icon)}
              </div>
              <CardTitle>{card.title}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}

interface CardsSectionProps {
  cards: DashboardCard[]
  sectionTitle: "Special Case" | "Management"
  onNavigate: (path: string) => void
}

export function CardsSection({ cards, sectionTitle, onNavigate }: CardsSectionProps) {
  if (cards.length === 0) return null

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "calendar":
        return <Calendar className="h-6 w-6 text-primary" />
      case "file-check":
        return <FileCheck className="h-6 w-6 text-primary" />
      case "receipt":
        return <Receipt className="h-6 w-6 text-primary" />
      case "wallet":
        return <Wallet className="h-6 w-6 text-primary" />
      case "building":
        return <Building2 className="h-6 w-6 text-primary" />
      case "file-text":
        return <FileText className="h-6 w-6 text-primary" />
      case "file-signature":
        return <FileSignature className="h-6 w-6 text-primary" />
      case "package":
        return <Package className="h-6 w-6 text-primary" />
      case "package-open":
        return <PackageOpen className="h-6 w-6 text-primary" />
      default:
        return <Package className="h-6 w-6 text-primary" />
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold tracking-tight">{sectionTitle}</h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card
            key={card.id}
            className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
            onClick={() => onNavigate(card.route)}
          >
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                {getIcon(card.icon)}
              </div>
              <CardTitle>{card.title}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
