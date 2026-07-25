import type { JSX } from 'react'
import { PageHeader } from '@/shared/presentation/components/PageHeader'
import { Button } from '@/components/ui/button'
import { useServicesPage } from '@/features/catalog/presentation/services/hooks/useServicesPage'
import { ServicesFilters } from '@/features/catalog/presentation/services/components/ServicesFilters'
import { ServicesList } from '@/features/catalog/presentation/services/components/ServicesList'
import { ServiceDialog } from '@/features/catalog/presentation/services/components/ServiceDialog'
import { ServiceDeleteDialog } from '@/features/catalog/presentation/services/components/ServiceDeleteDialog'

export function ServicesPage(): JSX.Element {
  const { onOpenCreate, filters, list, dialog, deleteDialog } = useServicesPage()

  return (
    <div>
      <PageHeader title="Serviços" action={<Button onClick={onOpenCreate}>Novo serviço</Button>} />

      <ServicesFilters {...filters} />

      <ServicesList {...list} />

      <ServiceDialog {...dialog} />

      <ServiceDeleteDialog
        target={deleteDialog.target}
        error={deleteDialog.error}
        isDeleting={deleteDialog.isDeleting}
        onCancel={deleteDialog.onCancel}
        onConfirm={deleteDialog.onConfirm}
      />
    </div>
  )
}
