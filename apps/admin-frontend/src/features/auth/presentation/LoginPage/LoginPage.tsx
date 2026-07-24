import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { resolvePostLoginPath } from '@/features/auth/application/navigation/postLoginPath'
import { AuthFlowScreen } from '@/features/auth/presentation/AuthFlowScreen'
import {
  toAuthFlowFeedback,
  type AuthFlowFeedback,
} from '@/features/auth/presentation/authFlowFeedback'
import { useAuth } from '@/features/auth/presentation/useAuth'
import { useTheme } from '@/shared/presentation/hooks/useTheme'

export function LoginPage(): JSX.Element {
  const { status, login } = useAuth()
  const { theme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const returnTo = readReturnTo(location.state)
  const loginStarted = useRef(false)
  const [feedback, setFeedback] = useState<AuthFlowFeedback | null>(null)

  const startLogin = useCallback(async (): Promise<void> => {
    setFeedback(null)
    try {
      await login(returnTo, theme)
    } catch (error) {
      setFeedback(toAuthFlowFeedback(error))
    }
  }, [login, returnTo, theme])

  useEffect(() => {
    if (status === 'authenticated') {
      void navigate(resolvePostLoginPath(returnTo), { replace: true })
      return
    }

    if (status === 'unauthenticated' && !loginStarted.current) {
      loginStarted.current = true
      void startLogin()
    }
  }, [navigate, returnTo, startLogin, status])

  if (feedback !== null) {
    return (
      <AuthFlowScreen
        state="error"
        eyebrow="Acesso não concluído"
        title={feedback.title}
        description={feedback.description}
        supportCode={feedback.supportCode}
        action={{
          label: 'Tentar entrar novamente',
          onAction: () => void startLogin(),
        }}
      />
    )
  }

  if (status === 'loading') {
    return (
      <AuthFlowScreen
        state="progress"
        eyebrow="Acesso seguro"
        title="Verificando sua sessão"
        description="Estamos conferindo se seu acesso ainda é válido antes de continuar."
      />
    )
  }

  if (status === 'authenticated') {
    return (
      <AuthFlowScreen
        state="progress"
        eyebrow="Acesso confirmado"
        title="Abrindo o sistema"
        description="Sua sessão está ativa. Você será levado automaticamente para a página solicitada."
      />
    )
  }

  return (
    <AuthFlowScreen
      state="progress"
      eyebrow="Acesso seguro"
      title="Redirecionando para o login"
      description="Você será levado para informar suas credenciais. Depois da confirmação, voltará para a página em que estava."
    />
  )
}

function readReturnTo(state: unknown): string | undefined {
  if (
    typeof state === 'object' &&
    state !== null &&
    'returnTo' in state &&
    typeof state.returnTo === 'string'
  ) {
    return state.returnTo
  }

  return undefined
}
