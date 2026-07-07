import { describe, it, expect, vi } from 'vitest'
import { InitiateLogin } from './InitiateLogin'
import { createFakeAuthRepository } from '../../test-helpers/createFakeAuthRepository'

describe('InitiateLogin', () => {
  it('delegates to the auth repository to begin the redirect-based login flow', async () => {
    const initiateLoginSpy = vi.fn(() => Promise.resolve())
    const authRepository = createFakeAuthRepository({ initiateLogin: initiateLoginSpy })

    const initiateLogin = new InitiateLogin(authRepository)
    await initiateLogin.execute()

    expect(initiateLoginSpy).toHaveBeenCalledTimes(1)
  })
})
