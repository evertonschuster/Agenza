import type { Decoder } from '@/shared/application/HttpClient'
import { ApiError } from '@/shared/infrastructure/http/ApiError'
import { parseProblemDetails } from '@/shared/infrastructure/http/ProblemDetails'

// Every non-204 success response is wrapped in { data, success, timestamp }
// by the backend's shared ResultExtensions.ToActionResult (docs/API.md) -
// unwrap once here so every entity's decoder validates the resource shape
// directly, instead of the envelope around it.
function unwrapData(rawBody: unknown): unknown {
  if (typeof rawBody === 'object' && rawBody !== null && 'data' in rawBody) {
    return rawBody.data
  }
  return rawBody
}

// Everything about interpreting a response body - success envelope,
// ProblemDetails, decode - lives here so AuthenticatedHttpClient only
// has to know how to attach a JWT and make the request.
export async function parseApiResponse<T>(response: Response, decode: Decoder<T>): Promise<T> {
  if (!response.ok) {
    const rawPayload: unknown = await response.json().catch(() => null)
    const payload = parseProblemDetails(rawPayload)
    const message = payload?.title ?? payload?.detail ?? response.statusText
    throw new ApiError(response.status, message, payload ?? undefined)
  }

  if (response.status === 204) {
    return decode(undefined)
  }

  const rawBody: unknown = await response.json()
  return decode(unwrapData(rawBody))
}
