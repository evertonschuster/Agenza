import type { JSX, MouseEvent } from 'react'
import type { Service } from '@/features/catalog/domain/entities/Service'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ServiceTableRow } from '@/features/catalog/presentation/services/ServiceTableRow'

export interface ServicesTableProps {
  services: readonly Service[]
  onEdit: (service: Service, event: MouseEvent<HTMLButtonElement>) => void
  onDelete: (service: Service) => void
}

export function ServicesTable({ services, onEdit, onDelete }: ServicesTableProps): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Duração</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Desconto máx.</TableHead>
            <TableHead>Etiquetas</TableHead>
            <TableHead className="sticky right-0 z-10 border-l border-border bg-background text-right">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map(service => (
            <ServiceTableRow
              key={service.id}
              service={service}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
