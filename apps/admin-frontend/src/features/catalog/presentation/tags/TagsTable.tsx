import type { JSX } from 'react'
import type { Tag } from '@/features/catalog/domain/entities/Tag'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CollectionFeedback } from '@/shared/presentation/components/CollectionFeedback'

export interface TagsTableProps {
  tags: Tag[]
  status: 'idle' | 'loading' | 'success' | 'error'
  error: unknown
  hasActiveSearch: boolean
  onRetry: () => void
  onEdit: (tag: Tag) => void
  onDelete: (tag: Tag) => void
}

export function TagsTable({
  tags,
  status,
  error,
  hasActiveSearch,
  onRetry,
  onEdit,
  onDelete,
}: TagsTableProps): JSX.Element {
  return (
    <div className="mt-6">
      <CollectionFeedback
        status={status}
        hasItems={tags.length > 0}
        error={error}
        loadingMessage="Carregando etiquetas…"
        loadErrorMessage="Não foi possível carregar as etiquetas"
        refreshErrorMessage="Não foi possível atualizar a lista de etiquetas"
        emptyMessage={
          hasActiveSearch
            ? 'Nenhuma etiqueta encontrada para essa busca.'
            : 'Nenhuma etiqueta ainda. Crie uma para começar.'
        }
        onRetry={onRetry}
      />

      {tags.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Etiqueta</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map(tag => (
                <TableRow key={tag.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: tag.color }}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-foreground">{tag.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">
                    {tag.description ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onEdit(tag)
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onDelete(tag)
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
    </div>
  )
}
