import { ErrorResponse, ErrorTimeout } from 'oidc-client-ts'
import { AuthFlowError } from '@/features/auth/application/errors/AuthFlowError'
import { MissingTenantClaimError } from '@/features/auth/infrastructure/MissingTenantClaimError'

export function mapLoginStartError(error: unknown): AuthFlowError {
  if (error instanceof ErrorTimeout) {
    return new AuthFlowError({
      code: 'timeout',
      flowCode: 'AUTH_LOGIN_TIMEOUT',
      message: 'O serviço de login demorou para responder. Aguarde um instante e tente novamente.',
      retryable: true,
    })
  }

  if (error instanceof TypeError) {
    return new AuthFlowError({
      code: 'network',
      flowCode: 'AUTH_LOGIN_UNAVAILABLE',
      message:
        'Não foi possível conectar ao serviço de login. Verifique sua conexão e tente novamente.',
      retryable: true,
    })
  }

  return new AuthFlowError({
    code: 'unexpected',
    flowCode: 'AUTH_LOGIN_FAILED',
    message: 'Não foi possível abrir o acesso seguro. Inicie uma nova tentativa.',
    retryable: true,
  })
}

export function mapCallbackError(error: unknown): AuthFlowError {
  if (error instanceof MissingTenantClaimError) {
    return new AuthFlowError({
      code: 'unauthorized',
      flowCode: 'AUTH_ACCOUNT_WITHOUT_TENANT',
      message:
        'Sua conta foi autenticada, mas ainda não está vinculada a uma empresa. Informe o código abaixo ao solicitar a vinculação.',
      retryable: false,
    })
  }

  if (error instanceof ErrorTimeout) {
    return new AuthFlowError({
      code: 'timeout',
      flowCode: 'AUTH_LOGIN_TIMEOUT',
      message:
        'O serviço de login demorou para confirmar seu acesso. Aguarde um instante e tente novamente.',
      retryable: true,
    })
  }

  if (error instanceof TypeError) {
    return new AuthFlowError({
      code: 'network',
      flowCode: 'AUTH_LOGIN_UNAVAILABLE',
      message:
        'A conexão com o serviço de login foi interrompida. Verifique sua internet e tente novamente.',
      retryable: true,
    })
  }

  if (error instanceof ErrorResponse) {
    if (error.error === 'access_denied') {
      return new AuthFlowError({
        code: 'unauthenticated',
        flowCode: 'AUTH_ACCESS_CANCELLED',
        message:
          'O acesso foi cancelado antes da confirmação. Você pode iniciar uma nova tentativa.',
        retryable: true,
      })
    }

    if (
      error.error === 'login_required' ||
      error.error === 'interaction_required' ||
      error.error === 'invalid_grant' ||
      error.error === 'invalid_request'
    ) {
      return new AuthFlowError({
        code: 'unauthenticated',
        flowCode: 'AUTH_ATTEMPT_EXPIRED',
        message:
          'Esta tentativa de login expirou ou já foi utilizada. Inicie uma nova tentativa para entrar.',
        retryable: true,
      })
    }

    if (error.error === 'temporarily_unavailable' || error.error === 'server_error') {
      return new AuthFlowError({
        code: 'network',
        flowCode: 'AUTH_LOGIN_UNAVAILABLE',
        message:
          'O serviço de login está temporariamente indisponível. Aguarde um instante e tente novamente.',
        retryable: true,
      })
    }
  }

  return new AuthFlowError({
    code: 'unexpected',
    flowCode: 'AUTH_RESPONSE_INVALID',
    message:
      'Não foi possível validar a resposta do serviço de login. Inicie uma nova tentativa para entrar.',
    retryable: true,
  })
}

export function mapLogoutError(error: unknown): AuthFlowError {
  if (error instanceof ErrorTimeout) {
    return new AuthFlowError({
      code: 'timeout',
      flowCode: 'AUTH_LOGOUT_FAILED',
      message: 'O serviço de login demorou para confirmar a saída. Tente novamente.',
      retryable: true,
    })
  }

  if (error instanceof TypeError) {
    return new AuthFlowError({
      code: 'network',
      flowCode: 'AUTH_LOGOUT_FAILED',
      message: 'Não foi possível conectar ao serviço de login para concluir a saída.',
      retryable: true,
    })
  }

  return new AuthFlowError({
    code: 'unexpected',
    flowCode: 'AUTH_LOGOUT_FAILED',
    message: 'Não foi possível concluir a saída. Tente novamente.',
    retryable: true,
  })
}
