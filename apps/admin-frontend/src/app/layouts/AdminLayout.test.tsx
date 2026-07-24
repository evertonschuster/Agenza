import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router'
import { AdminLayout } from '@/app/layouts/AdminLayout'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import { AuthProvider, ProtectedRoute, Tenant, User, type TenantContext } from '@/features/auth'
import { ThemeProvider } from '@/shared/presentation/providers/ThemeProvider'
import type { AppContainer } from '@/app/composition/container'
import { createFakeAppContainer } from '@/test/fixtures/createFakeAppContainer'
import { vi } from 'vitest'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  const user = User.create({ id: 'user-1', tenant, name: 'Bella Studio' })
  return { tenant, user }
}

function buildTenantContextWithoutName(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  const user = User.create({ id: 'user-1', tenant })
  return { tenant, user }
}

function buildContainer(
  tenantContext: TenantContext | null,
  logoutFn = vi.fn(() => Promise.resolve()),
): AppContainer {
  return createFakeAppContainer({
    auth: {
      getCurrentSession: { execute: vi.fn(() => Promise.resolve(tenantContext)) },
      logout: { execute: logoutFn },
    },
  })
}

// AdminLayout is only ever mounted through ProtectedRoute's Outlet in the
// real router (see router.tsx), so it never sees a loading/unauthenticated
// session (useAuthenticatedTenant relies on this) - the test tree mirrors
// that gating instead of mounting AdminLayout directly.
function renderLayout(container: AppContainer): void {
  render(
    <AppContainerContext.Provider value={container}>
      <AuthProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/dashboard" element={<div>Dashboard content</div>} />
                </Route>
              </Route>
              <Route path="/login" element={<div>Login page</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </AuthProvider>
    </AppContainerContext.Provider>,
  )
}

describe('AdminLayout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders every navigation item and the child route content', async () => {
    renderLayout(buildContainer(buildTenantContext()))

    expect(await screen.findByRole('link', { name: 'Painel' })).toBeInTheDocument()
    for (const label of [
      'Agendamentos',
      'Serviços',
      'Clientes',
      'Caixa de entrada',
      'Etiquetas',
      'Configurações',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
    expect(screen.getByText('Bella Studio')).toBeInTheDocument()
  })

  it("shows the authenticated user's business name in the sidebar", async () => {
    renderLayout(buildContainer(buildTenantContext()))

    expect(await screen.findByText('Bella Studio')).toBeInTheDocument()
  })

  it('falls back to a generic business name when the authenticated user has no name', async () => {
    renderLayout(buildContainer(buildTenantContextWithoutName()))

    expect(await screen.findByText('Minha Empresa')).toBeInTheDocument()
  })

  it('calls the logout use case when the sign out button is clicked', async () => {
    const logoutSpy = vi.fn(() => Promise.resolve())
    renderLayout(buildContainer(buildTenantContext(), logoutSpy))

    await userEvent.click(await screen.findByRole('button', { name: /sair/i }))

    expect(logoutSpy).toHaveBeenCalledTimes(1)
  })

  it('collapses the sidebar to icon-only and remembers the choice', async () => {
    renderLayout(buildContainer(buildTenantContext()))

    expect(await screen.findByRole('link', { name: 'Painel' })).not.toHaveAttribute('title')

    await userEvent.click(screen.getByRole('button', { name: /recolher menu lateral/i }))

    expect(screen.getByRole('link', { name: 'Painel' })).toHaveAttribute('title', 'Painel')
    expect(localStorage.getItem('admin-sidebar-collapsed')).toBe('true')

    await userEvent.click(screen.getByRole('button', { name: /expandir menu lateral/i }))

    expect(screen.getByRole('link', { name: 'Painel' })).not.toHaveAttribute('title')
    expect(localStorage.getItem('admin-sidebar-collapsed')).toBe('false')
  })

  it('opens and closes the mobile sidebar drawer', async () => {
    renderLayout(buildContainer(buildTenantContext()))

    await userEvent.click(await screen.findByRole('button', { name: /abrir menu/i }))
    const drawer = await screen.findByRole('dialog')

    await userEvent.click(within(drawer).getByRole('link', { name: 'Painel' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('applies the dark class to the document when the real sidebar theme toggle is clicked', async () => {
    renderLayout(buildContainer(buildTenantContext()))

    expect(document.documentElement).not.toHaveClass('dark')

    await userEvent.click(await screen.findByRole('button', { name: 'Mudar para modo escuro' }))

    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('admin-theme')).toBe('dark')
    expect(screen.getByRole('button', { name: 'Mudar para modo claro' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Mudar para modo claro' }))

    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('admin-theme')).toBe('light')
  })
})
