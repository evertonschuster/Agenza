import { useEffect, useState, type JSX } from 'react'
import { useNavigate } from 'react-router'
import { AuthFlowScreen } from '@/features/auth/presentation/AuthFlowScreen'
import {
  toAuthFlowFeedback,
  type AuthFlowFeedback,
} from '@/features/auth/presentation/authFlowFeedback'
import { useAuth } from '@/features/auth/presentation/useAuth'

export function CallbackPage(): JSX.Element {
  const { completeLogin } = useAuth()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState<AuthFlowFeedback | null>(null)

  useEffect(() => {
    async function finishCallback(): Promise<void> {
      const result = await completeLogin(window.location.href)
      if (result.success) {
        await navigate(result.value, { replace: true })
      } else {
        setFeedback(toAuthFlowFeedback(result.error))
      }
    }

    void finishCallback()
  }, [completeLogin, navigate])

  if (feedback !== null) {
    return (
      <AuthFlowScreen
        state="error"
        eyebrow="Acesso não concluído"
        title={feedback.title}
        description={feedback.description}
        supportCode={feedback.supportCode}
        action={{
          label: 'Iniciar um novo login',
          onAction: () => void navigate('/login', { replace: true }),
        }}
      />
    )
  }

  return (
    <AuthFlowScreen
      state="progress"
      eyebrow="Credenciais confirmadas"
      title="Concluindo seu login"
      description="Estamos preparando sua sessão segura. Em seguida, você voltará automaticamente para a página em que estava."
    />
  )
}
