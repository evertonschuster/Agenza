import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppProviders } from './AppProviders'
import { useAppContainer } from '../hooks/useAppContainer'
import type { AppContainer } from '../../composition/container'
import type { JSX } from 'react'

describe('AppProviders', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    vi.stubEnv('VITE_OIDC_AUTHORITY', 'https://identity.example.com')
    vi.stubEnv('VITE_OIDC_CLIENT_ID', 'admin-panel')
    vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'https://app.example.com/callback')
    vi.stubEnv('VITE_OIDC_POST_LOGOUT_REDIRECT_URI', 'https://app.example.com/login')
    vi.stubEnv('VITE_OIDC_SCOPE', 'openid profile tenant_id')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('provides a real container to descendants', () => {
    let received: AppContainer | null = null

    function Consumer(): JSX.Element {
      received = useAppContainer()
      return <div>container ready</div>
    }

    render(
      <AppProviders>
        <Consumer />
      </AppProviders>,
    )

    expect(screen.getByText('container ready')).toBeInTheDocument()
    expect(received).not.toBeNull()
  })

  it('constructs the container exactly once across re-renders', () => {
    const seen: AppContainer[] = []

    function Consumer(): JSX.Element {
      seen.push(useAppContainer())
      return <div>child</div>
    }

    const { rerender } = render(
      <AppProviders>
        <Consumer />
      </AppProviders>,
    )
    rerender(
      <AppProviders>
        <Consumer />
      </AppProviders>,
    )

    expect(seen.length).toBeGreaterThanOrEqual(2)
    expect(new Set(seen).size).toBe(1)
  })
})
