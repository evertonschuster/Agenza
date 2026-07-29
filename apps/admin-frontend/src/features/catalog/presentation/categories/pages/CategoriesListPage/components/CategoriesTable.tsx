import type { JSX } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusMessage } from '@/shared/presentation/components/StatusMessage'
import type { CategoriesTableProps } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/components/CategoriesTable.types'

export function CategoriesTable({
  state,
  hasActiveSearch,
  onRetry,
  onEdit,
  onDelete,
}: CategoriesTableProps): JSX.Element {
  if (state.status === 'loading') {
    return (
      <div className="mt-6">
        <StatusMessage>Carregando categorias…</StatusMessage>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="mt-6 space-y-3">
        <StatusMessage tone="error">
          Não foi possível carregar as categorias: {state.message}
        </StatusMessage>
        <Button type="button" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const { categories } = state

  return (
    <div className="mt-6">
      {categories.length === 0 && (
        <StatusMessage>
          {hasActiveSearch
            ? 'Nenhuma categoria encontrada para essa busca.'
            : 'Nenhuma categoria ainda. Crie uma para começar.'}
        </StatusMessage>
      )}

      {categories.length > 0 && (
        <div className="rounded-lg border">
          <Table className="table-fixed sm:table-auto">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-24 text-right sm:w-40">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(category => (
                <TableRow key={category.id}>
                  <TableCell className="whitespace-normal">
                    <span className="break-words font-medium text-foreground">{category.name}</span>
                  </TableCell>
                  <TableCell className="w-24 text-right sm:w-40">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 sm:h-7 sm:w-auto sm:gap-1 sm:px-2.5"
                        aria-label={`Editar categoria ${category.name}`}
                        onClick={() => {
                          onEdit(category)
                        }}
                      >
                        <Pencil aria-hidden="true" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="size-11 sm:h-7 sm:w-auto sm:gap-1 sm:px-2.5"
                        aria-label={`Excluir categoria ${category.name}`}
                        onClick={() => {
                          onDelete(category)
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                        <span className="hidden sm:inline">Excluir</span>
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
