import { AppError } from '@/shared/application/AppError'

export interface FieldError<TField extends string> {
  field: TField
  message: string
}

export interface ServerFormError<TField extends string> {
  // A readonly list, not Partial<Record<TField, string>> - Object.entries()
  // on a Record always returns string keys, erasing TField, which is
  // exactly what forced a `field as TagFormField`-style cast at every call
  // site before. A list of {field, message} pairs preserves TField and
  // first-error order without one.
  fieldErrors: readonly FieldError<TField>[]
  firstField: TField | null
  globalMessage: string | null
}

/**
 * Turns a caught mutation error into field-level messages a form can apply
 * via react-hook-form's setError, plus whatever couldn't be mapped to a
 * field. Differentiates by what the API actually sent instead of parsing
 * free text: a validation AppError (`rawFieldErrors`, from a 400 with a
 * structured `errors` map) maps each backend PascalCase property to the
 * form's field name via `fieldMap`; a Conflict/NotFound/Forbidden AppError
 * (`backendCode`) maps via `codeFieldMap` when the code names a specific
 * field (e.g. a duplicate-name conflict highlighting the name field),
 * otherwise it's a global message - never guessed from the message string
 * either way. Only ever depends on AppError (application) - ApiError/
 * ProblemDetails (infrastructure) are converted away before this runs
 * (see AuthenticatedHttpClient/mapErrorToAppError, docs/adr/007).
 */
export function mapApiErrorToForm<TField extends string>(
  error: unknown,
  fieldMap: Record<string, TField>,
  codeFieldMap: Record<string, TField>,
  fallbackMessage: string,
): ServerFormError<TField> {
  if (!(error instanceof AppError)) {
    const message = error instanceof Error ? error.message : fallbackMessage
    return { fieldErrors: [], firstField: null, globalMessage: message }
  }

  if (error.rawFieldErrors !== undefined) {
    const fieldErrors: FieldError<TField>[] = []
    let firstField: TField | null = null
    const unmapped: string[] = []

    for (const [backendField, message] of Object.entries(error.rawFieldErrors)) {
      const mappedField = fieldMap[backendField]
      if (mappedField !== undefined) {
        fieldErrors.push({ field: mappedField, message })
        firstField ??= mappedField
      } else {
        unmapped.push(message)
      }
    }

    if (fieldErrors.length > 0 || unmapped.length > 0) {
      return {
        fieldErrors,
        firstField,
        globalMessage: unmapped.length > 0 ? unmapped.join(' ') : null,
      }
    }
  }

  const mappedField = error.backendCode !== undefined ? codeFieldMap[error.backendCode] : undefined
  if (mappedField !== undefined) {
    return {
      fieldErrors: [{ field: mappedField, message: error.message }],
      firstField: mappedField,
      globalMessage: null,
    }
  }

  return { fieldErrors: [], firstField: null, globalMessage: error.message }
}
