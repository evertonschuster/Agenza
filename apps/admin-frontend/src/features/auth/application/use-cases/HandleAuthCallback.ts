import type { AuthRepository } from '@/features/auth/application/repositories/AuthRepository'
import {
  toTenantContext,
  type TenantContext,
} from '@/features/auth/application/context/TenantContext'
import { resolvePostLoginPath } from '@/features/auth/application/navigation/postLoginPath'

export interface CompletedAuthCallback {
  tenantContext: TenantContext
  returnTo: string
}

interface CachedCallback {
  url: string
  promise: Promise<CompletedAuthCallback>
}

// Single-flight per callback URL: an OAuth code is single-use, and
// StrictMode double-invokes effects - caching the in-flight promise here
// (not in the caller) prevents a second, real exchange with the provider.
export class HandleAuthCallback {
  private readonly authRepository: AuthRepository
  private cached: CachedCallback | null = null

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(callbackUrl: string): Promise<CompletedAuthCallback> {
    if (this.cached?.url !== callbackUrl) {
      this.cached = { url: callbackUrl, promise: this.performCallback(callbackUrl) }
    }

    return this.cached.promise
  }

  private async performCallback(callbackUrl: string): Promise<CompletedAuthCallback> {
    const { session, returnTo } = await this.authRepository.handleCallback(callbackUrl)

    return {
      tenantContext: toTenantContext(session.user),
      returnTo: resolvePostLoginPath(returnTo),
    }
  }
}
