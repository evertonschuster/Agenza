import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { LoginPage } from './LoginPage'
import { AppContainerContext } from '../../providers/AppContainerContext'
import type { AppContainer } from '../../../composition/container'
import { vi } from 'vitest'

function buildContainer(loginFn = vi.fn(() => Promise.resolve())): AppContainer {
  return {
    authRepository: {} as AppContainer['authRepository'],
    useCases: {
      initiateLogin: { execute: loginFn },
      handleAuthCallback: { execute: vi.fn(() => Promise.reject(new Error('not used'))) },
      getCurrentSession: { execute: vi.fn(() => Promise.resolve(null)) },
      logout: { execute: vi.fn(() => Promise.resolve()) },
    },
  } as unknown as AppContainer
}

function renderLoginPage(container: AppContainer): void {
  render(
    <AppContainerContext.Provider value={container}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AppContainerContext.Provider>,
  )
}

describe('LoginPage', () => {
  it('renders the sign-in button', () => {
    renderLoginPage(buildContainer())

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('calls login when the sign-in button is clicked', async () => {
    const loginSpy = vi.fn(() => Promise.resolve())
    renderLoginPage(buildContainer(loginSpy))

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(loginSpy).toHaveBeenCalledTimes(1)
  })

  it('disables the button while the login redirect is in progress', async () => {
    // login never resolves — simulates waiting for the browser redirect
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const loginFn = vi.fn(() => new Promise<void>(() => {}))
    renderLoginPage(buildContainer(loginFn))

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  })
})
