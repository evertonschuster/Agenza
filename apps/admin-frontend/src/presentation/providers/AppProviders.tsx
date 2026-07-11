import { useState, type ReactNode, type JSX } from 'react'
import { AppContainerContext } from './AppContainerContext'
import { ThemeProvider } from './ThemeProvider'
import { createAppContainer } from '../../composition/container'

interface AppProvidersProps {
  children: ReactNode
}

/**
 * Mounts the composition root once for the lifetime of the app. Uses
 * useState's lazy initializer (passing a function, not calling
 * createAppContainer() directly) so the container - and the UserManager
 * and OidcAuthRepository it builds - is constructed exactly once, not on
 * every render.
 */
export function AppProviders({ children }: AppProvidersProps): JSX.Element {
  const [container] = useState(() => createAppContainer())

  return (
    <AppContainerContext.Provider value={container}>
      <ThemeProvider>{children}</ThemeProvider>
    </AppContainerContext.Provider>
  )
}
