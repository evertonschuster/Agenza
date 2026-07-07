import { useContext } from 'react'
import { AppContainerContext } from '../providers/AppContainerContext'
import type { AppContainer } from '../../composition/container'

/**
 * Accesses the AppContainer built by the composition root. Throws
 * immediately if used outside AppContainerProvider rather than returning
 * null, since a missing container is always a setup bug, not a valid
 * runtime state a component should have to handle.
 */
export function useAppContainer(): AppContainer {
  const container = useContext(AppContainerContext)

  if (container === null) {
    throw new Error('useAppContainer must be used within an AppContainerProvider')
  }

  return container
}
