import { describe, it, expect, vi } from 'vitest'
import { Logout } from '@/features/auth/application/use-cases/Logout'
import { createFakeAuthRepository } from '@/features/auth/application/test-helpers/createFakeAuthRepository'

describe('Logout', () => {
  it('delegates to the auth repository to clear the session and end the provider session', async () => {
    const logoutSpy = vi.fn(() => Promise.resolve())
    const authRepository = createFakeAuthRepository({ logout: logoutSpy })

    const logout = new Logout(authRepository)
    await logout.execute()

    expect(logoutSpy).toHaveBeenCalledTimes(1)
  })
})
