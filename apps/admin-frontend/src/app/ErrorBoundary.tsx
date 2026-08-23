import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/shared/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundaries have no hook equivalent (React 19) — a class component is required.
 * Without this, an unexpected throw anywhere in the tree (e.g. AuthProvider) white-screens
 * the whole app with no fallback.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('app.unhandled_error', {
      message: error.message,
      componentStack: info.componentStack ?? null,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="font-semibold">Something went wrong.</p>
          <p className="text-sm text-muted-foreground">Please reload the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
