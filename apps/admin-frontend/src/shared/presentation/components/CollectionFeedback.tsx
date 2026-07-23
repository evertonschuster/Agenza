import type { JSX } from 'react'
import { StatusMessage } from '@/shared/presentation/components/StatusMessage'

export interface CollectionFeedbackProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  hasItems: boolean
  error: unknown
  loadingMessage: string
  /** Shown when the initial load fails and there's nothing to display yet. */
  loadErrorMessage: string
  /** Shown when a refresh fails but the last known-good list is still visible. */
  refreshErrorMessage: string
  emptyMessage: string
  onRetry: () => void
}

/** Shared loading/error/empty/last-known-good states for a tenant-scoped list - Tags/Categories' reference pattern. */
export function CollectionFeedback({
  status,
  hasItems,
  error,
  loadingMessage,
  loadErrorMessage,
  refreshErrorMessage,
  emptyMessage,
  onRetry,
}: CollectionFeedbackProps): JSX.Element | null {
  if (status === 'loading' && !hasItems) {
    return <StatusMessage>{loadingMessage}</StatusMessage>
  }

  if (status === 'error' && !hasItems) {
    return (
      <StatusMessage tone="error">
        {loadErrorMessage}
        {error instanceof Error ? `: ${error.message}` : '.'}
      </StatusMessage>
    )
  }

  // A refresh failing after items were already loaded keeps showing the
  // last known-good list instead of a blocking error.
  if (status === 'error' && hasItems) {
    return (
      <StatusMessage tone="error">
        {refreshErrorMessage}
        {error instanceof Error ? `: ${error.message}` : '.'} Mostrando os últimos dados carregados.{' '}
        <button type="button" onClick={onRetry} className="underline">
          Tentar novamente
        </button>
      </StatusMessage>
    )
  }

  if (status === 'success' && !hasItems) {
    return <StatusMessage>{emptyMessage}</StatusMessage>
  }

  return null
}
