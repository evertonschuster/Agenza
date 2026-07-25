import { useContext } from 'react'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import type { AppContainer } from '@/app/composition/container'

export function useAppContainer(): AppContainer {
  const container = useContext(AppContainerContext)

  if (container === null) {
    throw new Error('useAppContainer must be used within an AppContainerProvider')
  }

  return container
}
