import { describe, expect, it } from 'vitest'
import {
  DEFAULT_POST_LOGIN_PATH,
  resolvePostLoginPath,
} from '@/features/auth/application/navigation/postLoginPath'

describe('resolvePostLoginPath', () => {
  it('keeps an internal path with query and hash', () => {
    expect(resolvePostLoginPath('/services?search=massagem#editor')).toBe(
      '/services?search=massagem#editor',
    )
  })

  it.each([
    undefined,
    null,
    '',
    'services',
    'https://evil.example/services',
    '//evil.example/services',
    '/\\evil.example/services',
    '/login?returnTo=/services',
    '/callback?code=abc',
  ])('falls back to the dashboard for an unsafe destination: %s', candidate => {
    expect(resolvePostLoginPath(candidate)).toBe(DEFAULT_POST_LOGIN_PATH)
  })
})
