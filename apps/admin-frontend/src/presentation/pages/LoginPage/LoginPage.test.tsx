import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { axe } from 'jest-axe'
import { LoginPage } from './LoginPage'
import { AppContainerContext } from '../../providers/AppContainerContext'
import { AuthProvider } from '../../providers/AuthProvider'
import type { AppContainer } from '../../../composition/container'
import { createFakeAppContainer } from '../../../test/fixtures/createFakeAppContainer'
import { vi } from 'vitest'

function buildContainer(loginFn = vi.fn(() => Promise.resolve())): AppContainer {
  return createFakeAppContainer({ auth: { initiateLogin: { execute: loginFn } } })
}

function renderLoginPage(container: AppContainer): HTMLElement {
  return render(
    <AppContainerContext.Provider value={container}>
      <AuthProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    </AppContainerContext.Provider>,
  ).container
}

describe('LoginPage', () => {
  it('renders the sign-in button', async () => {
    renderLoginPage(buildContainer())

    // useAuth()'s session load resolves after this test's own assertions -
    // wait for it to settle so its state update is captured inside act()
    // instead of warning after the test body has already returned.
    expect(await screen.findByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('calls login when the sign-in button is clicked', async () => {
    const loginSpy = vi.fn(() => Promise.resolve())
    renderLoginPage(buildContainer(loginSpy))

    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    expect(loginSpy).toHaveBeenCalledTimes(1)
  })

  it('disables the button while the login redirect is in progress', async () => {
    // login never resolves — simulates waiting for the browser redirect
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const loginFn = vi.fn(() => new Promise<void>(() => {}))
    renderLoginPage(buildContainer(loginFn))

    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled()
  })

  it('has no axe violations in its default state', async () => {
    const container = renderLoginPage(buildContainer())
    await screen.findByRole('button', { name: /entrar/i })

    expect(await axe(container)).toHaveNoViolations()
  })
})
