import type { Result } from '@/shared/application/Result'

/** Unwraps a Result fixture built from known-valid test data - a failure
 * here means the fixture itself is wrong, so failing loudly is correct. */
export function unwrapResult<T>(result: Result<T, unknown>): T {
  if (!result.success) {
    throw new Error(
      `Expected a successful Result in test fixture, got a failure: ${String(result.error)}`,
    )
  }
  return result.value
}
