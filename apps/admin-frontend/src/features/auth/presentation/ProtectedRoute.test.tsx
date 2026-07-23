import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ProtectedRoute } from '@/features/auth/presentation/ProtectedRoute'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import { AuthProvider } from '@/features/auth/presentation/AuthProvider'
import { createFakeAppContainer } from '@/test/fixtures/createFakeAppContainer'
import type { AppContainer } from '@/app/composition/container'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import { User } from '@/features/auth/domain/entities/User'
import { vi } from 'vitest'

function buildContainer(
  sessionResult: 'loading' | 'authenticated' | 'unauthenticated',
): AppContainer {
  const tenant = Tenant.create('tenant-123')
  const user = User.create({ id: 'user-1', tenant })
  const tenantContext = { tenant, user }

  return createFakeAppContainer({
    auth: {
      getCurrentSession: {
        execute:
          sessionResult === 'loading'
            ? // eslint-disable-next-line @typescript-eslint/no-empty-function
              vi.fn(() => new Promise<null>(() => {})) // never resolves — simulates in-flight session check
            : sessionResult === 'authenticated'
              ? vi.fn(() => Promise.resolve(tenantContext))
              : vi.fn(() => Promise.resolve(null)),
      },
    },
  })
}

function renderWithRouter(container: AppContainer): void {
  render(
    <AppContainerContext.Provider value={container}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Protected content</div>} />
            </Route>
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </AppContainerContext.Provider>,
  )
}

describe('ProtectedRoute', () => {
  it('shows a loading state while the session is being checked', () => {
    renderWithRouter(buildContainer('loading'))

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })

  it('renders the child route when the session is authenticated', async () => {
    renderWithRouter(buildContainer('authenticated'))

    expect(await screen.findByText('Protected content')).toBeInTheDocument()
  })

  it('redirects to /login when there is no session', async () => {
    renderWithRouter(buildContainer('unauthenticated'))

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })
})
