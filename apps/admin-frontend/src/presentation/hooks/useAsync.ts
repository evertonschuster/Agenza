import { useCallback, useEffect, useRef, useState } from 'react'

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

interface UseAsyncResult<T> {
  status: AsyncStatus
  data: T | null
  error: unknown
  execute: () => Promise<T | undefined>
  /**
   * Applies a local, synchronous update to `data` without a network round
   * trip - e.g. inserting a just-created item immediately instead of
   * waiting for (or depending on the success of) a background refetch.
   */
  mutate: (updater: (current: T | null) => T | null) => void
}

interface UseAsyncOptions {
  /** Run the async function automatically on mount. Defaults to true. */
  immediate?: boolean
  /**
   * When this value changes identity between renders, `data`/`error` are
   * cleared synchronously - before the new `asyncFn` call resolves -
   * instead of leaving the previous key's data on screen while the new
   * fetch loads (this hook's default refetch behavior, which is correct
   * for a same-tenant page/filter change but wrong for a tenant switch).
   * Pass the tenant id for any tenant-scoped list hook. Omit it (or keep
   * it unchanged) for a plain refetch.
   */
  resetKey?: unknown
}

/**
 * The one shared pattern for "call an async function, track loading,
 * data, and error state" used across the app instead of a server-state
 * library. Every feature hook (useAppointments, useServices, etc. - and
 * useAuth right now) builds on this so loading/error handling stays
 * consistent rather than being reinvented per screen.
 *
 * Guards against setting state after the component unmounts (e.g. if
 * the async call resolves after navigating away), and against an older
 * in-flight call resolving after a newer one (e.g. a fast filter change,
 * page change, or tenant switch firing a second execute() before the
 * first's request lands) - only the most recently started call's result
 * is ever applied.
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  options: UseAsyncOptions = {},
): UseAsyncResult<T> {
  const { immediate = true, resetKey } = options
  const [status, setStatus] = useState<AsyncStatus>(immediate ? 'loading' : 'idle')
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  // Tracked in state, not a ref: React's own sanctioned pattern for
  // "reset state when a prop/key changes" ("storing information from
  // previous renders") reads/writes state during render, never a ref -
  // refs are for effect/event-time-only values (react-hooks/refs).
  const [previousResetKey, setPreviousResetKey] = useState(resetKey)
  const isMountedRef = useRef(true)
  const latestRequestIdRef = useRef(0)

  if (previousResetKey !== resetKey) {
    setPreviousResetKey(resetKey)
    // Adjusting state during render instead of an effect, so the previous
    // key's data/error is never painted even for a single frame - an
    // effect only runs after that first render has already committed.
    // A resetKey change is contractually paired with a new `asyncFn`
    // identity (see the option's doc comment), so the mount effect below
    // fires a fresh execute() right after this commit, which bumps
    // latestRequestIdRef itself (from an effect, not render) before any
    // stale in-flight call for the previous key can resolve.
    setData(null)
    setError(null)
    setStatus(immediate ? 'loading' : 'idle')
  }

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const execute = useCallback(async (): Promise<T | undefined> => {
    const requestId = ++latestRequestIdRef.current
    setStatus('loading')
    setError(null)

    try {
      const result = await asyncFn()

      if (isMountedRef.current && requestId === latestRequestIdRef.current) {
        setData(result)
        setStatus('success')
      }
      return result
    } catch (caughtError) {
      if (isMountedRef.current && requestId === latestRequestIdRef.current) {
        setError(caughtError)
        setStatus('error')
      }
      return undefined
    }
  }, [asyncFn])

  const mutate = useCallback((updater: (current: T | null) => T | null) => {
    setData(current => updater(current))
  }, [])

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

  return { status, data, error, execute, mutate }
}
