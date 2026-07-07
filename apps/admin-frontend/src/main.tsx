import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'
import { AppProviders } from './presentation/providers/AppProviders.tsx'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element with id "root" was not found in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
