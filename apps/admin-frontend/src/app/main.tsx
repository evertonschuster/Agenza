import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { App } from './App.tsx'
import { AppProviders } from './providers/AppProviders.tsx'
import { ErrorBoundary } from '@/shared/presentation/components/error/ErrorBoundary.tsx'
import { ConsoleErrorReporter } from '@/shared/infrastructure/observability/ConsoleErrorReporter'
import { createAppContainer } from './composition/container.ts'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element with id "root" was not found in index.html')
}

// The composition root: the only call to createAppContainer() in the app,
// made once here rather than inside a component - AppProviders just wires
// whatever container it's given into context (docs/adr/008).
const container = createAppContainer()

// Swap this instance for a real backend (Sentry, Application Insights, a
// custom endpoint) when one is chosen - every capture surface below only
// depends on the ErrorReporter port (docs/adr/014).
const errorReporter = new ConsoleErrorReporter()

// Two capture surfaces ErrorBoundary/RouteErrorElement structurally can't
// reach: a rejected promise never awaited (an async event handler) and a
// synchronous throw outside React's render/effect cycle.
window.addEventListener('unhandledrejection', event => {
  errorReporter.report(event.reason, { source: 'window.unhandledrejection' })
})
window.addEventListener('error', event => {
  errorReporter.report(event.error ?? event.message, { source: 'window.error' })
})

createRoot(rootElement, {
  // React 19: fires for every error a boundary catches/misses, regardless
  // of which of possibly several boundaries (ErrorBoundary, the router's
  // errorElement) handles it - one reporting call instead of one per
  // boundary implementation.
  onCaughtError: (error, errorInfo) => {
    errorReporter.report(error, {
      source: 'react.onCaughtError',
      extra: { componentStack: errorInfo.componentStack },
    })
  },
  onUncaughtError: (error, errorInfo) => {
    errorReporter.report(error, {
      source: 'react.onUncaughtError',
      extra: { componentStack: errorInfo.componentStack },
    })
  },
}).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProviders container={container}>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>,
)
