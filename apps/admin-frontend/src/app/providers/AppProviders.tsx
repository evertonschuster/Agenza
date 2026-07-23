import type { ReactNode, JSX } from 'react'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import { AuthProvider } from '@/features/auth'
import { ThemeProvider } from '@/shared/presentation/providers/ThemeProvider'
import type { AppContainer } from '@/app/composition/container'

interface AppProvidersProps {
  children: ReactNode
  container: AppContainer
}

/**
 * Wires an already-built AppContainer into context for the app. Takes the
 * container as a prop rather than constructing it (via createAppContainer())
 * itself - the composition root's own concern is which concrete adapters to
 * build; this component's only job is handing the result to React. The
 * caller (main.tsx) constructs the container exactly once, outside any
 * component render. AuthProvider must be inside AppContainerContext.Provider
 * (it reads the container) and outside/above every route so the whole app
 * shares one session snapshot.
 */
export function AppProviders({ children, container }: AppProvidersProps): JSX.Element {
  return (
    <AppContainerContext.Provider value={container}>
      <AuthProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </AuthProvider>
    </AppContainerContext.Provider>
  )
}
