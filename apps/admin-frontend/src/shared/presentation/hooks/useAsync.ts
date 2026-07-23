import { useCallback, useEffect, useRef, useState } from 'react'

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Identifies which "era" a request belongs to: key is the resetKey it was
 * bound to, generation its call order within that key. A call is safe to
 * commit only if both still match the live values - key alone misses a
 * newer same-key call, generation alone misses a call whose closure predates
 * a resetKey change but is invoked (with a fresh generation) after it.
 */
interface RequestEra {
  key: unknown
  generation: number
}

interface UseAsyncResult<T> {
  status: AsyncStatus
  data: T | null
  error: unknown
  execute: () => Promise<T | undefined>
  /** Local, synchronous update to `data`; pass captureGeneration()'s value as expectedGeneration to no-op if a newer request/resetKey has since superseded it. */
  mutate: (updater: (current: T | null) => T | null, expectedGeneration?: number) => void
  captureGeneration: () => number
}

interface UseAsyncOptions {
  /** Auto-runs asyncFn on mount. Default true. */
  immediate?: boolean
  /** Identity change (e.g. tenant id) clears data/error synchronously and starts a new era - pair with a fresh asyncFn identity. */
  resetKey?: unknown
}

/**
 * Shared "call an async function, track loading/data/error" hook every
 * feature hook (useCategories, useServices, useTags) and AuthProvider build
 * on, instead of a server-state library. Ignores a response/mutate call once
 * it's no longer part of the current era (unmounted, superseded by a newer
 * call, or from before the last resetKey change) - see RequestEra.
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  options: UseAsyncOptions = {},
): UseAsyncResult<T> {
  const { immediate = true, resetKey } = options
  const [status, setStatus] = useState<AsyncStatus>(immediate ? 'loading' : 'idle')
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  // React's sanctioned "reset state when a prop changes" pattern - state,
  // not a ref, so the previous era's data never paints for even one frame.
  const [previousResetKey, setPreviousResetKey] = useState(resetKey)

  const isMountedRef = useRef(true)
  const eraRef = useRef<RequestEra>({ key: resetKey, generation: 0 })

  if (previousResetKey !== resetKey) {
    setPreviousResetKey(resetKey)
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

  useEffect(() => {
    // Runs after every render (ref writes are disallowed during render
    // itself - react-hooks/refs) - relies on real async work outlasting one
    // effect flush, not a hard microtask-ordering guarantee.
    eraRef.current.key = resetKey
  })

  const execute = useCallback(async (): Promise<T | undefined> => {
    // capturedKey is this closure's own era (execute is recreated whenever
    // resetKey changes) - it can differ from eraRef.current.key if this
    // exact closure is invoked after resetKey has since moved on.
    const capturedKey = resetKey
    const generation = ++eraRef.current.generation
    setStatus('loading')
    setError(null)

    function isCurrent(): boolean {
      return (
        isMountedRef.current &&
        capturedKey === eraRef.current.key &&
        generation === eraRef.current.generation
      )
    }

    try {
      const result = await asyncFn()
      if (isCurrent()) {
        setData(result)
        setStatus('success')
      }
      return result
    } catch (caughtError) {
      if (isCurrent()) {
        setError(caughtError)
        setStatus('error')
      }
      return undefined
    }
  }, [asyncFn, resetKey])

  const mutate = useCallback(
    (updater: (current: T | null) => T | null, expectedGeneration?: number) => {
      if (expectedGeneration !== undefined && expectedGeneration !== eraRef.current.generation) {
        return
      }
      setData(current => updater(current))
    },
    [],
  )

  const captureGeneration = useCallback((): number => eraRef.current.generation, [])

  useEffect(() => {
    if (immediate) {
      // False positive (react/react#34743): the rule traces into execute()
      // and flags its setState calls, which only ever run after an await.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void execute()
    }
    // immediate only gates the initial mount call, not a value execute()
    // should re-run for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute])

  return { status, data, error, execute, mutate, captureGeneration }
}
