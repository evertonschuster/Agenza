import { useState, type JSX } from 'react'
import { useAuth } from '@/features/auth/presentation/useAuth'
import { CenteredScreen } from '@/shared/presentation/components/CenteredScreen'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

export function LoginPage(): JSX.Element {
  const { login } = useAuth()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [hasError, setHasError] = useState(false)

  async function handleSignIn(): Promise<void> {
    setHasError(false)
    setIsRedirecting(true)
    try {
      await login()
      setIsRedirecting(false)
    } catch {
      setHasError(true)
      setIsRedirecting(false)
    }
  }

  return (
    <CenteredScreen>
      <div className="w-full max-w-sm">
        <Card className="shadow-sm [--card-spacing:--spacing(8)]">
          <CardContent>
            <div className="mb-8 text-center">
              <span className="text-xs font-semibold tracking-widest text-primary uppercase">
                Receptionist AI
              </span>
              <h1 className="mt-3 text-2xl font-semibold text-foreground">Bem-vindo de volta</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Entre para gerenciar seus agendamentos e clientes.
              </p>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={() => void handleSignIn()}
              disabled={isRedirecting}
            >
              {isRedirecting ? (
                <>
                  <Spinner />
                  Entrando…
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            {hasError ? (
              <p className="mt-4 text-center text-sm text-destructive">
                Não foi possível acessar o serviço de login. Tente novamente em instantes.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          O acesso é restrito a empresas cadastradas.
        </p>
      </div>
    </CenteredScreen>
  )
}
