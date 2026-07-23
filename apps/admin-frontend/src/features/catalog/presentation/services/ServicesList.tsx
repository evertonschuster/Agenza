import type { JSX, MouseEvent } from 'react'
import type { Service } from '@/features/catalog/domain/entities/Service'
import { CollectionFeedback } from '@/shared/presentation/components/CollectionFeedback'
import { ServicesTable } from '@/features/catalog/presentation/services/ServicesTable'
import { ServicesPagination } from '@/features/catalog/presentation/services/ServicesPagination'
import type { AsyncState } from '@/shared/presentation/hooks/useAsync'
import type { UiError } from '@/shared/application/UiError'

export interface ServicesListProps {
  services: readonly Service[]
  listState: AsyncState<readonly Service[], UiError>
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
  listState,
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
      <CollectionFeedback
        state={listState}
        loadingMessage="Carregando serviços…"
        loadErrorMessage="Não foi possível carregar os serviços"
        refreshErrorMessage="Não foi possível atualizar a lista de serviços"
        emptyMessage={
          hasActiveFilters
            ? 'Nenhum serviço encontrado para esses filtros.'
            : 'Nenhum serviço ainda. Crie um para começar.'
        }
        onRetry={onRetry}
      />

      {services.length > 0 && (
        <ServicesTable services={services} onEdit={onEdit} onDelete={onDelete} />
      )}

      {services.length > 0 && (
        <ServicesPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  )
}
