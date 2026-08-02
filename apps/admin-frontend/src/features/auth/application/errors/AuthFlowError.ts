import { AppError, type AppErrorCode } from '@/shared/application/AppError'

export type AuthFlowErrorCode =
  | 'AUTH_LOGIN_UNAVAILABLE'
  | 'AUTH_LOGIN_TIMEOUT'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_ACCESS_CANCELLED'
  | 'AUTH_ATTEMPT_EXPIRED'
  | 'AUTH_RESPONSE_INVALID'
  | 'AUTH_ACCOUNT_WITHOUT_TENANT'
  | 'AUTH_LOGOUT_FAILED'

interface AuthFlowErrorInput {
  code: AppErrorCode
  flowCode: AuthFlowErrorCode
  message: string
  retryable: boolean
}

export class AuthFlowError extends AppError {
  readonly flowCode: AuthFlowErrorCode

  constructor(input: AuthFlowErrorInput) {
    super({
      code: input.code,
      message: input.message,
      retryable: input.retryable,
    })
    this.name = 'AuthFlowError'
    this.flowCode = input.flowCode
  }
}
