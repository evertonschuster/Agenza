import type { AuthRepository } from '@/features/auth/application/repositories/AuthRepository'
import {
  toTenantContext,
  type TenantContext,
} from '@/features/auth/application/context/TenantContext'

export class GetCurrentSession {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(): Promise<TenantContext | null> {
    const session = await this.authRepository.getCurrentSession()

    if (session === null) {
      return null
    }

    return toTenantContext(session.user)
  }
}
