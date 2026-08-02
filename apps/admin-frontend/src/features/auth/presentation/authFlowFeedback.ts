import { AuthFlowError } from '@/features/auth/application/errors/AuthFlowError'

export interface AuthFlowFeedback {
  title: string
  description: string
  supportCode: string
}

const TITLES: Record<AuthFlowError['flowCode'], string> = {
  AUTH_LOGIN_UNAVAILABLE: 'Serviço de login indisponível',
  AUTH_LOGIN_TIMEOUT: 'O login demorou mais que o esperado',
  AUTH_LOGIN_FAILED: 'Não foi possível abrir o login',
  AUTH_ACCESS_CANCELLED: 'Login cancelado',
  AUTH_ATTEMPT_EXPIRED: 'Tentativa de login expirada',
  AUTH_RESPONSE_INVALID: 'Resposta de login inválida',
  AUTH_ACCOUNT_WITHOUT_TENANT: 'Conta sem empresa vinculada',
  AUTH_LOGOUT_FAILED: 'Não foi possível sair',
}

export function toAuthFlowFeedback(error: unknown): AuthFlowFeedback {
  if (error instanceof AuthFlowError) {
    return {
      title: TITLES[error.flowCode],
      description: error.message,
      supportCode: error.flowCode,
    }
  }

  return {
    title: 'Não foi possível concluir o login',
    description:
      'O fluxo de acesso foi interrompido antes da confirmação. Inicie uma nova tentativa.',
    supportCode: 'AUTH_UNEXPECTED_FAILURE',
  }
}
