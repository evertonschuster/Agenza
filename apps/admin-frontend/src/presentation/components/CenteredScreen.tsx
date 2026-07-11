import type { JSX, ReactNode } from 'react'

interface CenteredScreenProps {
  children: ReactNode
}

export function CenteredScreen({ children }: CenteredScreenProps): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {children}
    </div>
  )
}
