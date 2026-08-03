import type { JSX } from 'react'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'
import { ErrorScreen } from '@/shared/presentation/components/screens/ErrorScreen'
import { isChunkLoadError } from '@/shared/presentation/components/error/isChunkLoadError'

// The router's errorElement (router.tsx) - distinct from ErrorBoundary,
// which covers everything outside the routed tree.
export function RouteErrorElement(): JSX.Element {
  const error = useRouteError()
  const navigate = useNavigate()

  const isNotFound = isRouteErrorResponse(error) && error.status === 404

  if (isChunkLoadError(error)) {
    return (
      <ErrorScreen
        title="Nova versão disponível"
        description="Uma nova versão do sistema foi publicada. Atualize a página para continuar."
        primaryActionLabel="Atualizar página"
        onPrimaryAction={() => {
          window.location.reload()
        }}
      />
    )
  }

  return (
    <ErrorScreen
      title={isNotFound ? 'Página não encontrada' : 'Algo deu errado'}
      description={
        isNotFound
          ? 'A página que você tentou acessar não existe.'
          : 'Não foi possível carregar esta página. Você pode tentar novamente ou voltar ao início.'
      }
      primaryActionLabel="Tentar novamente"
      onPrimaryAction={() => {
        window.location.reload()
      }}
      secondaryAction={{
        label: 'Voltar ao início',
        onAction: () => {
          void navigate('/dashboard', { replace: true })
        },
      }}
    />
  )
}
