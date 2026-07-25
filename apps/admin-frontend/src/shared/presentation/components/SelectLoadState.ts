// A discriminated union, not three independent props - status/error/onRetry
// can't be combined incoherently (e.g. 'success' with a leftover error).
export type SelectLoadState =
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; message: string; onRetry?: () => void }
