import { useEffect, useState, type JSX } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAppContainer } from '../../hooks/useAppContainer'
import { CenteredScreen } from '../../components/CenteredScreen'
import { Card, CardContent } from '@/components/ui/card'
import { FullScreenSpinner } from '../../components/FullScreenSpinner'

type CallbackStatus = 'processing' | 'error'

export function CallbackPage(): JSX.Element {
  const { useCases } = useAppContainer()
  const navigate = useNavigate()
  const [status, setStatus] = useState<CallbackStatus>('processing')

  useEffect(() => {
    async function completeLogin(): Promise<void> {
      try {
        await useCases.handleAuthCallback.execute(window.location.href)
        await navigate('/dashboard', { replace: true })
      } catch {
        setStatus('error')
      }
    }

    void completeLogin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'error') {
    return (
      <CenteredScreen>
        <Card className="w-full max-w-sm shadow-sm ring-destructive/20 [--card-spacing:--spacing(8)]">
          <CardContent className="text-center">
            <p className="text-sm font-semibold text-destructive">Falha no login</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Algo deu errado ao concluir o login. Tente novamente.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
            >
              Voltar para o login
            </Link>
          </CardContent>
        </Card>
      </CenteredScreen>
    )
  }

  return <FullScreenSpinner label="Concluindo login…" />
}
