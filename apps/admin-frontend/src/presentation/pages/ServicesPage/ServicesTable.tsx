import type { JSX, MouseEvent } from 'react'
import type { Service } from '../../../domain/entities/Service'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusMessage } from '../../components/StatusMessage'
import { formatDuration, formatPrice } from './serviceFormatters'

export interface ServicesTableProps {
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

export function ServicesTable({
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
}: ServicesTableProps): JSX.Element {
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

      {/* A refresh that fails after a service was already loaded (e.g. right
          after a successful create/update/delete) keeps showing the last
          known-good list instead of replacing it with a blocking error -
          the mutation itself already succeeded, only the sync afterward
          failed. */}
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
                <TableRow key={service.id}>
                  <TableCell className="text-muted-foreground">{service.code}</TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground">{service.name}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {service.categoryName ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDuration(service)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatPrice(service.price)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {service.maxDiscountPercentage}%
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {service.tags.length === 0 && (
                        <span className="text-muted-foreground">—</span>
                      )}
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {services.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                onPageChange(page - 1)
              }}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => {
                onPageChange(page + 1)
              }}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
