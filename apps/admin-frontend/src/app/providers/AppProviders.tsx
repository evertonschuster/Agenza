import type { ReactNode, JSX } from 'react'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import { AuthProvider } from '@/features/auth'
import { ThemeProvider } from '@/shared/presentation/providers/ThemeProvider'
import type { AppContainer } from '@/app/composition/container'

interface AppProvidersProps {
  children: ReactNode
  container: AppContainer
}

// AuthProvider must stay inside AppContainerContext.Provider (it reads the
// container) and above every route so the whole app shares one session.
export function AppProviders({ children, container }: AppProvidersProps): JSX.Element {
  return (
    <AppContainerContext.Provider value={container}>
      <AuthProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </AuthProvider>
    </AppContainerContext.Provider>
  )
}
