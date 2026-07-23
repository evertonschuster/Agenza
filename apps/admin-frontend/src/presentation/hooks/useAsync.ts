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
   *
   * Pass the generation captured via `captureGeneration()` *before* starting
   * the async operation that produced this update, so a stale operation
   * (e.g. a create started against tenant A, resolving after the app has
   * already switched to tenant B) can't apply its result to the current
   * state - see docs/adr for the tenant-switch-during-a-POST scenario this
   * guards against. Omit it for an update that should always apply (e.g.
   * clearing state on session invalidation, which is authoritative
   * regardless of what else is in flight).
   */
  mutate: (updater: (current: T | null) => T | null, expectedGeneration?: number) => void
  /**
   * Snapshots "which execute()/resetKey era we're currently in" - capture
   * this right before starting a mutation, then pass it back to `mutate` so
   * the mutation can detect if a resetKey change (tenant switch) or a newer
   * execute() has since superseded it.
   */
  captureGeneration: () => number
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
  // Always mirrors the latest resetKey, independent of any particular
  // execute() closure - lets a call started under an old resetKey detect,
  // at commit time, that it belongs to an abandoned era (see execute below).
  const currentResetKeyRef = useRef(resetKey)

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

  // No dependency array: syncs after every render (refs must not be
  // written during render itself - react-hooks/refs), which is still
  // synchronously ahead of any async continuation that reads it, since
  // effects for this commit all run before any microtask from a pending
  // execute()/mutate() call gets a chance to.
  useEffect(() => {
    currentResetKeyRef.current = resetKey
  })

  const execute = useCallback(async (): Promise<T | undefined> => {
    const requestId = ++latestRequestIdRef.current
    // Captured now, not read again later: a closure created under tenant A
    // (e.g. a createTag's own background `void execute()`, called from
    // inside an async function that only reaches this point after an
    // earlier await) must not apply its result once the app has since
    // moved on to tenant B, even if no *newer* execute() call happened to
    // race it - requestId ordering alone can't detect that case, since
    // this closure would otherwise look like "the latest call" by default.
    const resetKeyAtStart = resetKey
    setStatus('loading')
    setError(null)

    function isStillCurrent(): boolean {
      return (
        isMountedRef.current &&
        requestId === latestRequestIdRef.current &&
        resetKeyAtStart === currentResetKeyRef.current
      )
    }

    try {
      const result = await asyncFn()

      if (isStillCurrent()) {
        setData(result)
        setStatus('success')
      }
      return result
    } catch (caughtError) {
      if (isStillCurrent()) {
        setError(caughtError)
        setStatus('error')
      }
      return undefined
    }
    // resetKey is intentionally included even though asyncFn's identity is
    // contractually paired with it (see UseAsyncOptions.resetKey) - this
    // makes execute robust even if a future caller changes resetKey without
    // also changing asyncFn's identity.
  }, [asyncFn, resetKey])

  const mutate = useCallback(
    (updater: (current: T | null) => T | null, expectedGeneration?: number) => {
      if (expectedGeneration !== undefined && expectedGeneration !== latestRequestIdRef.current) {
        return
      }
      setData(current => updater(current))
    },
    [],
  )

  const captureGeneration = useCallback((): number => latestRequestIdRef.current, [])

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

  return { status, data, error, execute, mutate, captureGeneration }
}
