import type { JSX, MouseEvent } from 'react'
import type { Service } from '@/features/catalog/domain/entities/Service'
import { StatusMessage } from '@/shared/presentation/components/StatusMessage'
import { ServicesTable } from '@/features/catalog/presentation/services/ServicesTable'
import { ServicesPagination } from '@/features/catalog/presentation/services/ServicesPagination'

export interface ServicesListProps {
  services: Service[]
  status: 'idle' | 'loading' | 'success' | 'error'
  error: unknown
  hasActiveFilters: boolean
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onRetry: () => void
  onEdit: (service: Service, event: MouseEvent<HTMLButtonElement>) => void
  onDelete: (service: Service) => void
}

/** Decides loading/error/empty/last-known-good; delegates rendering to ServicesTable/ServicesPagination. */
export function ServicesList({
  services,
  status,
  error,
  hasActiveFilters,
  page,
  totalPages,
  onPageChange,
  onRetry,
  onEdit,
  onDelete,
}: ServicesListProps): JSX.Element {
  return (
    <div className="mt-6">
      {status === 'loading' && services.length === 0 && (
        <StatusMessage>Carregando serviços…</StatusMessage>
      )}

      {status === 'error' && services.length === 0 && (
        <StatusMessage tone="error">
          Não foi possível carregar os serviços
          {error instanceof Error ? `: ${error.message}` : '.'}
        </StatusMessage>
      )}

      {/* A refetch failing after a service was already loaded keeps showing
          the last known-good list instead of a blocking error. */}
      {status === 'error' && services.length > 0 && (
        <StatusMessage tone="error">
          Não foi possível atualizar a lista de serviços
          {error instanceof Error ? `: ${error.message}` : '.'} Mostrando os últimos dados
          carregados.{' '}
          <button type="button" onClick={onRetry} className="underline">
            Tentar novamente
          </button>
        </StatusMessage>
      )}

      {status === 'success' && services.length === 0 && (
        <StatusMessage>
          {hasActiveFilters
            ? 'Nenhum serviço encontrado para esses filtros.'
            : 'Nenhum serviço ainda. Crie um para começar.'}
        </StatusMessage>
      )}

      {services.length > 0 && (
        <ServicesTable services={services} onEdit={onEdit} onDelete={onDelete} />
      )}

      {services.length > 0 && (
        <ServicesPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  )
}
