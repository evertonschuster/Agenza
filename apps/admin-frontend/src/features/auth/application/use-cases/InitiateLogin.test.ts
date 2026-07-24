import { describe, it, expect, vi } from 'vitest'
import { InitiateLogin } from '@/features/auth/application/use-cases/InitiateLogin'
import { createFakeAuthRepository } from '@/features/auth/application/test-helpers/createFakeAuthRepository'

describe('InitiateLogin', () => {
  it('delegates with the page that should be restored after login', async () => {
    const initiateLoginSpy = vi.fn(() => Promise.resolve())
    const authRepository = createFakeAuthRepository({ initiateLogin: initiateLoginSpy })

    const initiateLogin = new InitiateLogin(authRepository)
    await initiateLogin.execute('/services?search=massagem#editor')

    expect(initiateLoginSpy).toHaveBeenCalledExactlyOnceWith('/services?search=massagem#editor')
  })
})
