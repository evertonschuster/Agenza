import type { JSX } from 'react'
import { LayoutDashboard } from 'lucide-react'
import { PlaceholderPage } from '@/shared/presentation/components/PlaceholderPage'

export function DashboardPage(): JSX.Element {
  return <PlaceholderPage title="Painel" icon={LayoutDashboard} />
}
