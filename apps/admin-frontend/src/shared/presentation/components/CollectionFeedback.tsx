import type { JSX } from 'react'
import { StatusMessage } from '@/shared/presentation/components/StatusMessage'
import type { AsyncState } from '@/shared/presentation/hooks/useAsync'
import type { UiError } from '@/shared/application/UiError'

export interface CollectionFeedbackProps<T> {
  state: AsyncState<readonly T[], UiError>
  loadingMessage: string
  /** Shown when the initial load fails and there's nothing to display yet. */
  loadErrorMessage: string
  /** Shown when a refresh fails but the last known-good list is still visible. */
  refreshErrorMessage: string
  emptyMessage: string
  onRetry: () => void
}

/** Shared loading/error/empty/last-known-good states for a tenant-scoped list - Tags/Categories' reference pattern. */
export function CollectionFeedback<T>({
  state,
  loadingMessage,
  loadErrorMessage,
  refreshErrorMessage,
  emptyMessage,
  onRetry,
}: CollectionFeedbackProps<T>): JSX.Element | null {
  switch (state.status) {
    case 'loading':
      return <StatusMessage>{loadingMessage}</StatusMessage>

    case 'initialError':
      return (
        <StatusMessage tone="error">
          {loadErrorMessage}: {state.error.message}
        </StatusMessage>
      )

    // A refresh failing after items were already loaded keeps showing the
    // last known-good list instead of a blocking error.
    case 'refreshError':
      return (
        <StatusMessage tone="error">
          {refreshErrorMessage}: {state.error.message} Mostrando os últimos dados carregados.{' '}
          <button type="button" onClick={onRetry} className="underline">
            Tentar novamente
          </button>
        </StatusMessage>
      )

    case 'success':
      return state.data.length === 0 ? <StatusMessage>{emptyMessage}</StatusMessage> : null

    default:
      return null
  }
}
