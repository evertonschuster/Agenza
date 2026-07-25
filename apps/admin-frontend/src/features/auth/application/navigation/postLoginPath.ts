export const DEFAULT_POST_LOGIN_PATH = '/dashboard'

const INTERNAL_ORIGIN = 'https://admin.local'
const AUTH_ENTRY_PATHS = new Set(['/login', '/callback'])

export function resolvePostLoginPath(candidate: string | null | undefined): string {
  if (candidate?.startsWith('/') !== true) {
    return DEFAULT_POST_LOGIN_PATH
  }

  try {
    const parsed = new URL(candidate, INTERNAL_ORIGIN)

    if (parsed.origin !== INTERNAL_ORIGIN || AUTH_ENTRY_PATHS.has(parsed.pathname)) {
      return DEFAULT_POST_LOGIN_PATH
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return DEFAULT_POST_LOGIN_PATH
  }
}
