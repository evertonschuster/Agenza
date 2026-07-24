import type { AuthRepository } from '@/features/auth/application/repositories/AuthRepository'
import {
  toTenantContext,
  type TenantContext,
} from '@/features/auth/application/context/TenantContext'

interface CachedCallback {
  url: string
  promise: Promise<TenantContext>
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

  async execute(callbackUrl: string): Promise<TenantContext> {
    if (this.cached?.url !== callbackUrl) {
      this.cached = { url: callbackUrl, promise: this.performCallback(callbackUrl) }
    }

    return this.cached.promise
  }

  private async performCallback(callbackUrl: string): Promise<TenantContext> {
    const session = await this.authRepository.handleCallback(callbackUrl)

    return toTenantContext(session.user)
  }
}
