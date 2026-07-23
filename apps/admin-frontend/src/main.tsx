import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'
import { AppProviders } from './presentation/providers/AppProviders.tsx'
import { ErrorBoundary } from './presentation/components/ErrorBoundary.tsx'
import { createAppContainer } from './composition/container.ts'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element with id "root" was not found in index.html')
}

// The composition root: the only call to createAppContainer() in the app,
// made once here rather than inside a component - AppProviders just wires
// whatever container it's given into context (docs/adr/008).
const container = createAppContainer()

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProviders container={container}>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>,
)
