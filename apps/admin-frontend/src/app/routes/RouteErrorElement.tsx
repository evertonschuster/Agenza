import type { JSX } from 'react'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'
import { ErrorScreen } from '@/shared/presentation/components/ErrorScreen'
import { isChunkLoadError } from '@/shared/presentation/components/isChunkLoadError'

/**
 * The router's top-level errorElement (see router.tsx) - catches errors
 * React Router's own mechanism handles directly (a thrown loader, no
 * matching route, or a lazy route chunk failing to load), distinct from
 * ErrorBoundary which covers everything outside the routed tree.
 */
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
      secondaryActionLabel="Voltar ao início"
      onSecondaryAction={() => {
        void navigate('/dashboard', { replace: true })
      }}
    />
  )
}
