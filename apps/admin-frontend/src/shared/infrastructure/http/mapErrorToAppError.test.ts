import { describe, it, expect } from 'vitest'
import { mapErrorToAppError } from '@/shared/infrastructure/http/mapErrorToAppError'
import { ApiError } from '@/shared/infrastructure/http/ApiError'
import { UnauthenticatedError } from '@/shared/infrastructure/http/UnauthenticatedError'
import { NetworkError } from '@/shared/infrastructure/http/NetworkError'
import { TimeoutError } from '@/shared/infrastructure/http/TimeoutError'
import { AppError } from '@/shared/application/AppError'

describe('mapErrorToAppError', () => {
  it('returns an already-converted AppError unchanged', () => {
    const original = new AppError({ code: 'conflict', message: 'já existe', retryable: false })

    expect(mapErrorToAppError(original)).toBe(original)
  })

  it('maps UnauthenticatedError to code "unauthenticated"', () => {
    const result = mapErrorToAppError(new UnauthenticatedError())

    expect(result.code).toBe('unauthenticated')
    expect(result.retryable).toBe(false)
  })

  it('maps TimeoutError to code "timeout", retryable', () => {
    const result = mapErrorToAppError(new TimeoutError())

    expect(result.code).toBe('timeout')
    expect(result.retryable).toBe(true)
  })

  it('maps NetworkError to code "network", retryable', () => {
    const result = mapErrorToAppError(new NetworkError())

    expect(result.code).toBe('network')
    expect(result.retryable).toBe(true)
  })

  it('maps a 400 ApiError with a structured errors map to validation with flattened rawFieldErrors', () => {
    const apiError = new ApiError(400, 'Ocorreram erros de validação.', {
      status: 400,
      code: 'Tag.ValidationFailed',
      errors: {
        Name: [{ code: 'Tag.NameRequired', message: 'O nome é obrigatório.' }],
        Description: [{ code: 'Tag.DescriptionTooLong', message: 'A descrição é muito longa.' }],
      },
    })

    const result = mapErrorToAppError(apiError)

    expect(result.code).toBe('validation')
    expect(result.retryable).toBe(false)
    expect(result.rawFieldErrors).toEqual({
      Name: 'O nome é obrigatório.',
      Description: 'A descrição é muito longa.',
    })
    expect(result.backendCode).toBe('Tag.ValidationFailed')
  })

  it('maps a 400 ApiError without an errors map to validation with no rawFieldErrors', () => {
    const apiError = new ApiError(400, 'Only a detail here.', { status: 400 })

    const result = mapErrorToAppError(apiError)

    expect(result.code).toBe('validation')
    expect(result.rawFieldErrors).toBeUndefined()
    expect(result.message).toBe('Only a detail here.')
  })

  it('maps a 401 ApiError to unauthenticated with a curated message', () => {
    const apiError = new ApiError(401, 'raw backend text', { status: 401 })

    const result = mapErrorToAppError(apiError)

    expect(result.code).toBe('unauthenticated')
    expect(result.message).not.toBe('raw backend text')
  })

  it('maps a 403 ApiError to unauthorized with a curated message', () => {
    const apiError = new ApiError(403, 'raw backend text', { status: 403 })

    const result = mapErrorToAppError(apiError)

    expect(result.code).toBe('unauthorized')
    expect(result.message).not.toBe('raw backend text')
  })

  it('maps a 404 ApiError to notFound, preserving the backend message and code', () => {
    const apiError = new ApiError(404, 'Widget not found', {
      status: 404,
      code: 'Widget.NotFound',
    })

    const result = mapErrorToAppError(apiError)

    expect(result.code).toBe('notFound')
    expect(result.message).toBe('Widget not found')
    expect(result.backendCode).toBe('Widget.NotFound')
  })

  it('maps a 409 ApiError to conflict, preserving the backend message and code', () => {
    const apiError = new ApiError(409, 'Já existe uma etiqueta com esse nome.', {
      status: 409,
      code: 'Tag.DuplicateName',
    })

    const result = mapErrorToAppError(apiError)

    expect(result.code).toBe('conflict')
    expect(result.message).toBe('Já existe uma etiqueta com esse nome.')
    expect(result.backendCode).toBe('Tag.DuplicateName')
  })

  it('maps an unrecognized status (e.g. 500) to a curated unexpected message, discarding the raw one', () => {
    const apiError = new ApiError(500, 'Internal Server Error', { status: 500 })

    const result = mapErrorToAppError(apiError)

    expect(result.code).toBe('unexpected')
    expect(result.retryable).toBe(true)
    expect(result.message).not.toBe('Internal Server Error')
  })

  it('maps a completely unrecognized thrown value to a curated unexpected AppError', () => {
    const result = mapErrorToAppError('a plain string, not even an Error')

    expect(result.code).toBe('unexpected')
    expect(result.retryable).toBe(true)
  })

  it('maps a generic Error to a curated unexpected AppError, not its raw message', () => {
    const result = mapErrorToAppError(new Error('some internal implementation detail'))

    expect(result.code).toBe('unexpected')
    expect(result.message).not.toBe('some internal implementation detail')
  })
})
