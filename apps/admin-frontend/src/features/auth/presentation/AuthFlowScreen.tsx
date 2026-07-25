import type { JSX } from 'react'
import { ArrowRight, CircleAlert, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { CenteredScreen } from '@/shared/presentation/components/CenteredScreen'

interface AuthFlowScreenProps {
  state: 'progress' | 'error'
  eyebrow: string
  title: string
  description: string
  supportCode?: string
  action?: {
    label: string
    onAction: () => void
  }
}

export function AuthFlowScreen({
  state,
  eyebrow,
  title,
  description,
  supportCode,
  action,
}: AuthFlowScreenProps): JSX.Element {
  const isError = state === 'error'

  return (
    <CenteredScreen>
      <Card
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
        className="w-full max-w-md overflow-hidden border-border/70 shadow-lg shadow-primary/5 [--card-spacing:--spacing(8)]"
      >
        <CardContent>
          <div className="flex flex-col items-center text-center">
            <div
              className={
                isError
                  ? 'flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive'
                  : 'flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary'
              }
            >
              {isError ? <CircleAlert className="size-6" /> : <ShieldCheck className="size-6" />}
            </div>

            <p
              className={
                isError
                  ? 'mt-5 text-xs font-semibold tracking-widest text-destructive uppercase'
                  : 'mt-5 text-xs font-semibold tracking-widest text-primary uppercase'
              }
            >
              {eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>

            {isError && supportCode !== undefined ? (
              <div className="mt-5 w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-left">
                <p className="text-xs font-medium text-muted-foreground">
                  Código para solicitar ajuda
                </p>
                <code className="mt-1 block text-sm font-semibold text-foreground">
                  {supportCode}
                </code>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Ao pedir ajuda, envie este código e o horário da tentativa. Isso permite
                  identificar o ponto exato da falha sem compartilhar sua senha.
                </p>
              </div>
            ) : null}

            {!isError ? (
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-foreground">
                <Spinner className="size-4 text-primary" />
                Redirecionamento automático em andamento
              </div>
            ) : null}

            {action !== undefined ? (
              <Button size="lg" className="mt-6 w-full" onClick={action.onAction}>
                {action.label}
                <ArrowRight />
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </CenteredScreen>
  )
}
