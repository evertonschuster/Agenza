import type { JSX } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '@/components/ui/button'
import { useServicesController } from './useServicesController'
import { ServicesFilters } from './ServicesFilters'
import { ServicesTable } from './ServicesTable'
import { ServiceDialog } from './ServiceDialog'
import { ServiceDeleteDialog } from './ServiceDeleteDialog'

export function ServicesPage(): JSX.Element {
  const { onOpenCreate, filters, table, formDialog, discardConfirm, deleteDialog } =
    useServicesController()

  return (
    <div>
      <PageHeader title="Serviços" action={<Button onClick={onOpenCreate}>Novo serviço</Button>} />

      <ServicesFilters {...filters} />

      <ServicesTable {...table} />

      <ServiceDialog {...formDialog} discardConfirm={discardConfirm} />

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
