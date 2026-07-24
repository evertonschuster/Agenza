import type { JSX } from 'react'
import { CenteredScreen } from '@/shared/presentation/components/CenteredScreen'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ErrorScreenProps {
  title: string
  description: string
  primaryActionLabel: string
  onPrimaryAction: () => void
  secondaryAction?: { label: string; onAction: () => void }
}

/**
 * The shared full-page "something went wrong" presentation used by both
 * ErrorBoundary (unexpected render/chunk-load errors) and RouteErrorElement
 * (React Router's own error mechanism) - one visual and copy source so the
 * two don't drift into inconsistent messaging.
 */
export function ErrorScreen({
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryAction,
}: ErrorScreenProps): JSX.Element {
  return (
    <CenteredScreen>
      <Card
        role="alert"
        className="w-full max-w-sm shadow-sm ring-destructive/20 [--card-spacing:--spacing(8)]"
      >
        <CardContent className="text-center">
          <p className="text-sm font-semibold text-destructive">{title}</p>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={onPrimaryAction}>{primaryActionLabel}</Button>
            {secondaryAction !== undefined && (
              <Button variant="outline" onClick={secondaryAction.onAction}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </CenteredScreen>
  )
}
