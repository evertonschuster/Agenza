import { useEffect, useState, type JSX } from 'react'
import { NavLink, Outlet } from 'react-router'
import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  Inbox as InboxIcon,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Menu,
  Settings as SettingsIcon,
  Sparkles,
  Tag as TagIcon,
  Users,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ThemeToggle } from '../components/ThemeToggle'

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Painel', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Agendamentos', to: '/appointments', icon: CalendarDays },
  { label: 'Serviços', to: '/services', icon: Sparkles },
  { label: 'Clientes', to: '/clients', icon: Users },
  { label: 'Caixa de entrada', to: '/inbox', icon: InboxIcon },
  { label: 'Etiquetas', to: '/tags', icon: TagIcon },
  { label: 'Configurações', to: '/settings', icon: SettingsIcon },
]

const COLLAPSE_STORAGE_KEY = 'admin-sidebar-collapsed'

function getInitialCollapsed(): boolean {
  return localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true'
}

interface SidebarNavProps {
  isCollapsed: boolean
  onNavigate?: () => void
}

function SidebarNav({ isCollapsed, onNavigate }: SidebarNavProps): JSX.Element {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={onNavigate}
              {...(isCollapsed ? { 'aria-label': label, title: label } : {})}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isCollapsed ? 'md:justify-center' : '',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                ].join(' ')
              }
            >
              <Icon aria-hidden="true" className="size-4.5 shrink-0" />
              <span className={isCollapsed ? 'md:hidden' : ''}>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

interface SidebarFooterProps {
  isCollapsed: boolean
  businessName: string
  onLogout: () => void
}

function SidebarFooter({ isCollapsed, businessName, onLogout }: SidebarFooterProps): JSX.Element {
  return (
    <div className="space-y-3 border-t border-sidebar-border p-3">
      <div
        className={['flex items-center gap-2 px-1', isCollapsed ? 'md:justify-center' : ''].join(
          ' ',
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {businessName.charAt(0).toUpperCase()}
        </span>
        <p
          className={[
            'min-w-0 flex-1 truncate text-sm font-medium text-sidebar-foreground',
            isCollapsed ? 'md:hidden' : '',
          ].join(' ')}
        >
          {businessName}
        </p>
      </div>

      <div
        className={[
          'flex items-center gap-1',
          isCollapsed ? 'md:flex-col md:items-center' : '',
        ].join(' ')}
      >
        <ThemeToggle />
        <Button
          variant="ghost"
          className={['flex-1 justify-start', isCollapsed ? 'md:flex-none' : ''].join(' ')}
          onClick={onLogout}
        >
          <LogOut aria-hidden="true" />
          <span className={isCollapsed ? 'md:hidden' : ''}>Sair</span>
        </Button>
      </div>
    </div>
  )
}

export function AdminLayout(): JSX.Element {
  const { tenantContext, logout } = useAuth()
  const businessName = tenantContext?.user.name ?? 'Minha Empresa'
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, String(isCollapsed))
  }, [isCollapsed])

  function handleLogout(): void {
    void logout()
  }

  return (
    <div className="flex h-screen bg-background">
      <aside
        className={[
          'hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex',
          isCollapsed ? 'md:w-16' : 'md:w-64',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-4 py-4">
          {!isCollapsed && (
            <span className="truncate text-sm font-semibold tracking-wide text-primary uppercase">
              Receptionist AI
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            className="shrink-0"
            onClick={() => {
              setIsCollapsed(current => !current)
            }}
          >
            {isCollapsed ? (
              <ChevronsRight aria-hidden="true" />
            ) : (
              <ChevronsLeft aria-hidden="true" />
            )}
          </Button>
        </div>

        <SidebarNav isCollapsed={isCollapsed} />
        <SidebarFooter
          isCollapsed={isCollapsed}
          businessName={businessName}
          onLogout={handleLogout}
        />
      </aside>

      {/* Sheet wraps Radix Dialog, so the mobile drawer gets focus trap,
          focus restoration, Escape-to-close, and aria-modal semantics for free
          — none of that was hand-rolled correctly by the previous version. */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent
          side="left"
          className="gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground md:hidden"
        >
          <SheetHeader className="border-b border-sidebar-border">
            <SheetTitle className="text-sm font-semibold tracking-wide text-primary uppercase">
              Receptionist AI
            </SheetTitle>
          </SheetHeader>
          <SidebarNav
            isCollapsed={false}
            onNavigate={() => {
              setIsMobileOpen(false)
            }}
          />
          <SidebarFooter isCollapsed={false} businessName={businessName} onLogout={handleLogout} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Abrir menu"
            onClick={() => {
              setIsMobileOpen(true)
            }}
          >
            <Menu aria-hidden="true" />
          </Button>
          <span className="text-sm font-semibold tracking-wide text-primary uppercase">
            Receptionist AI
          </span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
