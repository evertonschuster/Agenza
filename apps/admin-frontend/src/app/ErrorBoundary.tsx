import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/shared/logger';
import { FullScreenMessage } from '@/shared/ui/FullScreenMessage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Error boundaries have no hook equivalent (React 19) — must be a class component. */
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
      return <FullScreenMessage title="Algo deu errado." description="Recarregue a página." />;
    }

    return this.props.children;
  }
}
