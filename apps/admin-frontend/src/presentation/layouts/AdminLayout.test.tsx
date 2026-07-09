import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router'
import { AdminLayout } from './AdminLayout'
import { AppContainerContext } from '../providers/AppContainerContext'
import type { AppContainer } from '../../composition/container'
import type { TenantContext } from '../../application/context/TenantContext'
import { Tenant } from '../../domain/value-objects/Tenant'
import { User } from '../../domain/entities/User'
import { vi } from 'vitest'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  const user = User.create({ id: 'user-1', tenant, name: 'Bella Studio' })
  return { tenant, user }
}

function buildContainer(
  tenantContext: TenantContext | null,
  logoutFn = vi.fn(() => Promise.resolve()),
): AppContainer {
  return {
    authRepository: {} as AppContainer['authRepository'],
    useCases: {
      initiateLogin: { execute: vi.fn(() => Promise.resolve()) },
      handleAuthCallback: { execute: vi.fn(() => Promise.reject(new Error('not used'))) },
      getCurrentSession: { execute: vi.fn(() => Promise.resolve(tenantContext)) },
      logout: { execute: logoutFn },
    },
  } as unknown as AppContainer
}

function renderLayout(container: AppContainer): void {
  render(
    <AppContainerContext.Provider value={container}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<div>Dashboard content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AppContainerContext.Provider>,
  )
}

describe('AdminLayout', () => {
  it('renders every navigation item and the child route content', () => {
    renderLayout(buildContainer(buildTenantContext()))

    for (const label of [
      'Dashboard',
      'Appointments',
      'Services',
      'Clients',
      'Inbox',
      'Tags',
      'Settings',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })

  it("shows the authenticated user's business name in the sidebar", async () => {
    renderLayout(buildContainer(buildTenantContext()))

    expect(await screen.findByText('Bella Studio')).toBeInTheDocument()
  })

  it('falls back to a generic business name when there is no session', async () => {
    renderLayout(buildContainer(null))

    expect(await screen.findByText('My Business')).toBeInTheDocument()
  })

  it('calls the logout use case when the sign out button is clicked', async () => {
    const logoutSpy = vi.fn(() => Promise.resolve())
    renderLayout(buildContainer(buildTenantContext(), logoutSpy))

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))

    expect(logoutSpy).toHaveBeenCalledTimes(1)
  })
})
