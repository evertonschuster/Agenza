import type { AuthRepository } from '@/features/auth/application/repositories/AuthRepository'
import type { AuthFlowError } from '@/features/auth/application/errors/AuthFlowError'
import {
  toTenantContext,
  type TenantContext,
} from '@/features/auth/application/context/TenantContext'
import { resolvePostLoginPath } from '@/features/auth/application/navigation/postLoginPath'
import { success, type Result } from '@/shared/application/Result'

export interface CompletedAuthCallback {
  tenantContext: TenantContext
  returnTo: string
}

interface CachedCallback {
  url: string
  promise: Promise<Result<CompletedAuthCallback, AuthFlowError>>
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

  async execute(callbackUrl: string): Promise<Result<CompletedAuthCallback, AuthFlowError>> {
    if (this.cached?.url !== callbackUrl) {
      this.cached = { url: callbackUrl, promise: this.performCallback(callbackUrl) }
    }

    return this.cached.promise
  }

  private async performCallback(
    callbackUrl: string,
  ): Promise<Result<CompletedAuthCallback, AuthFlowError>> {
    const result = await this.authRepository.handleCallback(callbackUrl)
    if (!result.success) {
      return result
    }

    return success({
      tenantContext: toTenantContext(result.value.session.user),
      returnTo: resolvePostLoginPath(result.value.returnTo),
    })
  }
}
