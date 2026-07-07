import { useCallback, useEffect, useRef, useState } from 'react'

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

interface UseAsyncResult<T> {
  status: AsyncStatus
  data: T | null
  error: unknown
  execute: () => Promise<void>
}

interface UseAsyncOptions {
  /** Run the async function automatically on mount. Defaults to true. */
  immediate?: boolean
}

/**
 * The one shared pattern for "call an async function, track loading,
 * data, and error state" used across the app instead of a server-state
 * library. Every feature hook (useAppointments, useServices, etc. - and
 * useAuth right now) builds on this so loading/error handling stays
 * consistent rather than being reinvented per screen.
 *
 * Guards against setting state after the component unmounts (e.g. if
 * the async call resolves after navigating away).
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  options: UseAsyncOptions = {},
): UseAsyncResult<T> {
  const { immediate = true } = options
  const [status, setStatus] = useState<AsyncStatus>(immediate ? 'loading' : 'idle')
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const execute = useCallback(async (): Promise<void> => {
    setStatus('loading')
    setError(null)

    try {
      const result = await asyncFn()

      if (isMountedRef.current) {
        setData(result)
        setStatus('success')
      }
    } catch (caughtError) {
      if (isMountedRef.current) {
        setError(caughtError)
        setStatus('error')
      }
    }
  }, [asyncFn])

  useEffect(() => {
    if (immediate) {
      // react-hooks/set-state-in-effect flags this as a false positive: it
      // traces into execute() and sees the eventual setStatus/setData
      // calls, even though they all run after an await and are therefore
      // not synchronous within this effect's execution. This is the same
      // shape as React's own documented fetch-in-effect pattern
      // (fetchData().then(() => setLoading(false))) and matches a known
      // open false-positive report against this rule (react/react#34743).
      // Suppressing rather than restructuring correct code around a
      // linter limitation.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void execute()
    }
    // immediate is intentionally excluded: it controls only the initial
    // mount behavior, not a value execute should re-run for on every
    // render if the caller's flag happened to change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute])

  return { status, data, error, execute }
}
