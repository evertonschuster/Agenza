import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorScreen } from '@/shared/presentation/components/ErrorScreen'
import { isChunkLoadError } from '@/shared/presentation/components/isChunkLoadError'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  isChunkLoadError: boolean
}

/**
 * Catches render/lifecycle errors in its subtree - not a crash before
 * render starts (main.tsx's createAppContainer() call) or errors from event
 * handlers/async code. RouteErrorElement handles router-level errors instead.
 * console.error below also runs in production - only the UI message is hidden.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, isChunkLoadError: false }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, isChunkLoadError: isChunkLoadError(error) }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled UI error caught by ErrorBoundary', error, errorInfo)
  }

  private handleRetry = (): void => {
    if (this.state.isChunkLoadError) {
      // A stale chunk reference can't recover by re-rendering the same
      // tree - reload fetches the current asset manifest.
      window.location.reload()
      return
    }
    this.setState({ hasError: false, isChunkLoadError: false })
  }

  private handleGoHome = (): void => {
    window.location.assign('/dashboard')
  }

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.state.isChunkLoadError) {
      return (
        <ErrorScreen
          title="Nova versão disponível"
          description="Uma nova versão do sistema foi publicada. Atualize a página para continuar."
          primaryActionLabel="Atualizar página"
          onPrimaryAction={this.handleRetry}
        />
      )
    }

    return (
      <ErrorScreen
        title="Algo deu errado"
        description="Não foi possível exibir esta tela. Você pode tentar novamente ou voltar ao início."
        primaryActionLabel="Tentar novamente"
        onPrimaryAction={this.handleRetry}
        secondaryAction={{ label: 'Voltar ao início', onAction: this.handleGoHome }}
      />
    )
  }
}
