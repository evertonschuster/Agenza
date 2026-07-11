import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { CallbackPage } from './CallbackPage'
import { AppContainerContext } from '../../providers/AppContainerContext'
import type { AppContainer } from '../../../composition/container'
import { vi } from 'vitest'

function buildContainer(handleCallbackFn: (url: string) => Promise<void>): AppContainer {
  return {
    authRepository: {} as AppContainer['authRepository'],
    useCases: {
      initiateLogin: { execute: vi.fn(() => Promise.resolve()) },
      handleAuthCallback: { execute: handleCallbackFn },
      getCurrentSession: { execute: vi.fn(() => Promise.resolve(null)) },
      logout: { execute: vi.fn(() => Promise.resolve()) },
    },
  } as unknown as AppContainer
}

function renderCallbackPage(container: AppContainer): void {
  render(
    <AppContainerContext.Provider value={container}>
      <MemoryRouter initialEntries={['/callback']}>
        <Routes>
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    </AppContainerContext.Provider>,
  )
}

describe('CallbackPage', () => {
  it('shows a processing state while the callback is being handled', () => {
    // never resolves — simulates an in-flight token exchange
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const handleCallback = vi.fn(() => new Promise<void>(() => {}))
    renderCallbackPage(buildContainer(handleCallback))

    expect(screen.getByText(/concluindo login/i)).toBeInTheDocument()
  })

  it('passes the full current URL to the callback use case', async () => {
    const handleCallback = vi.fn(() => Promise.resolve())
    renderCallbackPage(buildContainer(handleCallback))

    await screen.findByText('Dashboard page')

    expect(handleCallback).toHaveBeenCalledExactlyOnceWith(window.location.href)
  })

  it('navigates to the dashboard when the callback succeeds', async () => {
    renderCallbackPage(buildContainer(vi.fn(() => Promise.resolve())))

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
  })

  it('shows the error state with a way back to login when the callback fails', async () => {
    renderCallbackPage(buildContainer(vi.fn(() => Promise.reject(new Error('exchange failed')))))

    expect(await screen.findByText(/falha no login/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /voltar para o login/i })).toHaveAttribute(
      'href',
      '/login',
    )
  })
})
