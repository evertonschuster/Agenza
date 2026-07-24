/**
 * Shared load/error/success contract for CreatableSingleSelect/
 * CreatableMultiSelect - a select in the error state always has a message,
 * and `onRetry` is only present when the underlying failure is actually
 * retryable, instead of `status`/`error`/`onRetry` being three independent
 * props a caller could combine incoherently (e.g. status: 'success' with a
 * leftover error message).
 */
export type SelectLoadState =
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; message: string; onRetry?: () => void }
