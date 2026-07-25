import { useCallback, useEffect, useRef, useState } from 'react'
import { toUiError, type UiError } from '@/shared/application/UiError'

// Each variant carries only the fields valid for it, so a refresh failure
// (refreshError, keeps last known-good data) can't be confused with a
// blocking initial failure (initialError, no data yet).
export type AsyncState<T, E = unknown> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'refreshing'; data: T; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'initialError'; data: null; error: E }
  | { status: 'refreshError'; data: T; error: E }

export type AsyncStatus = AsyncState<unknown>['status']

// A call is safe to commit only if BOTH key and generation still match the
// live values - key alone misses a newer same-key call, generation alone
// misses a call whose closure predates a resetKey change.
interface RequestEra {
  key: unknown
  generation: number
}

type UseAsyncResult<T> = AsyncState<T> & {
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

function idleOrLoading<T>(immediate: boolean): AsyncState<T> {
  return immediate
    ? { status: 'loading', data: null, error: null }
    : { status: 'idle', data: null, error: null }
}

function startState<T>(current: AsyncState<T>): AsyncState<T> {
  return current.data !== null
    ? { status: 'refreshing', data: current.data, error: null }
    : { status: 'loading', data: null, error: null }
}

function errorState<T>(current: AsyncState<T>, error: unknown): AsyncState<T> {
  return current.data !== null
    ? { status: 'refreshError', data: current.data, error }
    : { status: 'initialError', data: null, error }
}

// Ignores a response/mutate call once it's no longer part of the current
// era (unmounted, superseded, or from before the last resetKey change).
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  options: UseAsyncOptions = {},
): UseAsyncResult<T> {
  const { immediate = true, resetKey } = options
  const [state, setState] = useState<AsyncState<T>>(() => idleOrLoading<T>(immediate))
  // React's sanctioned "reset state when a prop changes" pattern - state,
  // not a ref, so the previous era's data never paints for even one frame.
  const [previousResetKey, setPreviousResetKey] = useState(resetKey)

  const isMountedRef = useRef(true)
  const eraRef = useRef<RequestEra>({ key: resetKey, generation: 0 })

  if (previousResetKey !== resetKey) {
    setPreviousResetKey(resetKey)
    setState(idleOrLoading<T>(immediate))
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
    setState(startState)

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
        setState({ status: 'success', data: result, error: null })
      }
      return result
    } catch (caughtError) {
      if (isCurrent()) {
        setState(current => errorState(current, caughtError))
      }
      return undefined
    }
  }, [asyncFn, resetKey])

  const mutate = useCallback(
    (updater: (current: T | null) => T | null, expectedGeneration?: number) => {
      if (expectedGeneration !== undefined && expectedGeneration !== eraRef.current.generation) {
        return
      }
      setState(current => {
        const nextData = updater(current.data)
        return nextData !== null
          ? { status: 'success', data: nextData, error: null }
          : { status: 'idle', data: null, error: null }
      })
    },
    [],
  )

  const captureGeneration = useCallback((): number => eraRef.current.generation, [])

  useEffect(() => {
    if (immediate) {
      void execute()
    }
    // immediate only gates the initial mount call, not a value execute()
    // should re-run for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute])

  return { ...state, execute, mutate, captureGeneration }
}

// Converts AsyncState's `unknown` error into a curated UiError - components
// never interpret an arbitrary exception themselves.
export function toUiAsyncState<T>(state: AsyncState<T>): AsyncState<T, UiError> {
  switch (state.status) {
    case 'initialError':
      return { status: 'initialError', data: null, error: toUiError(state.error) }
    case 'refreshError':
      return { status: 'refreshError', data: state.data, error: toUiError(state.error) }
    default:
      return state
  }
}
