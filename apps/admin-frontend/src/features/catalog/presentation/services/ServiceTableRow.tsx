import type { JSX, MouseEvent } from 'react'
import type { Service } from '@/features/catalog/domain/entities/Service'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  formatDuration,
  formatPrice,
} from '@/features/catalog/presentation/services/serviceFormatters'

export interface ServiceTableRowProps {
  service: Service
  onEdit: (service: Service, event: MouseEvent<HTMLButtonElement>) => void
  onDelete: (service: Service) => void
}

export function ServiceTableRow({ service, onEdit, onDelete }: ServiceTableRowProps): JSX.Element {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{service.code}</TableCell>
      <TableCell>
        <span className="font-medium text-foreground">{service.name}</span>
      </TableCell>
      <TableCell className="text-muted-foreground">{service.categoryName ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">{formatDuration(service)}</TableCell>
      <TableCell className="text-muted-foreground">{formatPrice(service.price)}</TableCell>
      <TableCell className="text-muted-foreground">{service.maxDiscountPercentage}%</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {service.tags.length === 0 && <span className="text-muted-foreground">—</span>}
          {service.tags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-foreground"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color }}
                aria-hidden="true"
              />
              {tag.name}
            </span>
          ))}
        </div>
      </TableCell>
      <TableCell className="sticky right-0 border-l border-border bg-background text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={event => {
              onEdit(service, event)
            }}
          >
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onDelete(service)
            }}
          >
            Excluir
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
