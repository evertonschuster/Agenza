import { AppError } from '@/shared/application/AppError'

export interface FieldError<TField extends string> {
  field: TField
  message: string
}

export interface ServerFormError<TField extends string> {
  // A list, not Partial<Record<TField, string>> - Object.entries() on a
  // Record erases TField, forcing a cast at every call site.
  fieldErrors: readonly FieldError<TField>[]
  firstField: TField | null
  globalMessage: string | null
}

// Maps a validation AppError's rawFieldErrors via fieldMap, or a
// Conflict/NotFound/Forbidden AppError's backendCode via codeFieldMap -
// never guessed from the message string either way.
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
