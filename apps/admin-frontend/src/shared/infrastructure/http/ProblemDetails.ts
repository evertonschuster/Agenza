export interface FieldError {
  code: string
  message: string
}

/**
 * RFC 7807 Problem Details, extended with this API's structured-error
 * fields (docs/adr/0012): `code` is present on every error response,
 * `errors` only on validation failures (400) - a per-property array of
 * `{code, message}` keyed by the backend's PascalCase property name.
 */
export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  code?: string
  errors?: Record<string, FieldError[]>
}

function isFieldError(value: unknown): value is FieldError {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return typeof record.code === 'string' && typeof record.message === 'string'
}

function isFieldErrorArray(value: unknown): value is FieldError[] {
  return Array.isArray(value) && value.every(isFieldError)
}

function isFieldErrorMap(value: unknown): value is Record<string, FieldError[]> {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return Object.values(value).every(isFieldErrorArray)
}

/**
 * Safe runtime parse of a response body as ProblemDetails - never trusts
 * the shape blindly (no `any`, no sniffing error kind from message text).
 * Returns null for anything that isn't at least a JSON object.
 */
export function parseProblemDetails(raw: unknown): ProblemDetails | null {
  if (typeof raw !== 'object' || raw === null) {
    return null
  }
  const value = raw as Record<string, unknown>
  const problemDetails: ProblemDetails = {}

  if (typeof value.type === 'string') {
    problemDetails.type = value.type
  }
  if (typeof value.title === 'string') {
    problemDetails.title = value.title
  }
  if (typeof value.status === 'number') {
    problemDetails.status = value.status
  }
  if (typeof value.detail === 'string') {
    problemDetails.detail = value.detail
  }
  if (typeof value.code === 'string') {
    problemDetails.code = value.code
  }
  if (isFieldErrorMap(value.errors)) {
    problemDetails.errors = value.errors
  }

  return problemDetails
}
