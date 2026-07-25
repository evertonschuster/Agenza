import { createContext } from 'react'
import type { AppContainer } from '@/app/composition/container'

export const AppContainerContext = createContext<AppContainer | null>(null)
