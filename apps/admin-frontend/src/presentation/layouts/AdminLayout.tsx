import type { JSX } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth'

interface NavItem {
  label: string
  to: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Appointments', to: '/appointments' },
  { label: 'Services', to: '/services' },
  { label: 'Clients', to: '/clients' },
  { label: 'Inbox', to: '/inbox' },
  { label: 'Tags', to: '/tags' },
  { label: 'Settings', to: '/settings' },
]

export function AdminLayout(): JSX.Element {
  const { tenantContext, logout } = useAuth()
  const businessName = tenantContext?.user.name ?? 'My Business'

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-5">
          <span className="text-sm font-semibold tracking-wide text-teal-700 uppercase">
            Receptionist AI
          </span>
          <p className="mt-0.5 truncate text-xs text-slate-500">{businessName}</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ label, to }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    [
                      'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-l-2 border-teal-600 bg-teal-50 pl-[10px] text-teal-700'
                        : 'border-l-2 border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    ].join(' ')
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-slate-200 p-4">
          <button
            onClick={() => void logout()}
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            type="button"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
