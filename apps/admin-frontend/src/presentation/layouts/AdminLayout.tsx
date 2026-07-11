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

export function AdminLayout(): JSX.Element {
  const { tenantContext, logout } = useAuth()
  const businessName = tenantContext?.user.name ?? 'Minha Empresa'
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, String(isCollapsed))
  }, [isCollapsed])

  useEffect(() => {
    if (!isMobileOpen) {
      return
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsMobileOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileOpen])

  return (
    <div className="flex h-screen bg-background">
      {isMobileOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-foreground/40 md:hidden"
          onClick={() => {
            setIsMobileOpen(false)
          }}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200',
          'md:relative md:z-auto md:translate-x-0 md:transition-[width]',
          isMobileOpen ? 'translate-x-0' : '',
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
            className="hidden shrink-0 md:inline-flex"
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

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => {
                    setIsMobileOpen(false)
                  }}
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

        <div className="space-y-3 border-t border-sidebar-border p-3">
          <div
            className={[
              'flex items-center gap-2 px-1',
              isCollapsed ? 'md:justify-center' : '',
            ].join(' ')}
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
              onClick={() => void logout()}
            >
              <LogOut aria-hidden="true" />
              <span className={isCollapsed ? 'md:hidden' : ''}>Sair</span>
            </Button>
          </div>
        </div>
      </aside>

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
