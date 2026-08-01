import type {
  AuthRepository,
  LoginTheme,
} from '@/features/auth/application/repositories/AuthRepository'
import type { AuthFlowError } from '@/features/auth/application/errors/AuthFlowError'
import type { Result } from '@/shared/application/Result'
import { resolvePostLoginPath } from '@/features/auth/application/navigation/postLoginPath'

export class InitiateLogin {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(
    returnTo: string | undefined,
    theme: LoginTheme,
  ): Promise<Result<void, AuthFlowError>> {
    return this.authRepository.initiateLogin(resolvePostLoginPath(returnTo), theme)
  }
}
