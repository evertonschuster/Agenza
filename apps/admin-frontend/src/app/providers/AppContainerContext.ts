import { createContext } from 'react'
import type { AppContainer } from '@/app/composition/container'

/**
 * Holds the AppContainer for the component tree. Starts as null so
 * useAppContainer can fail loudly if a component tries to use it outside
 * of AppProviders, rather than silently receiving an unconfigured value.
 */
export const AppContainerContext = createContext<AppContainer | null>(null)
