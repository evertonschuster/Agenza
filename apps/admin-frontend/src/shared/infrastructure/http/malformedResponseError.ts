import { AppError } from '@/shared/application/AppError'

// A domain entity rejecting data that already passed shape validation
// means the backend sent something a client can't reasonably act on -
// not a validation/conflict/notFound outcome the user caused.
export function malformedResponseError(): AppError {
  return new AppError({
    code: 'unexpected',
    message: 'Não foi possível processar os dados recebidos do servidor.',
    retryable: true,
  })
}
