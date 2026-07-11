import type { JSX } from 'react'
import { CenteredScreen } from './CenteredScreen'
import { Spinner } from '@/components/ui/spinner'

interface FullScreenSpinnerProps {
  label?: string
}

export function FullScreenSpinner({ label }: FullScreenSpinnerProps): JSX.Element {
  return (
    <CenteredScreen>
      <div className="flex flex-col items-center gap-3">
        <Spinner className="size-7 text-primary" />
        {label !== undefined && <p className="text-sm text-muted-foreground">{label}</p>}
      </div>
    </CenteredScreen>
  )
}
