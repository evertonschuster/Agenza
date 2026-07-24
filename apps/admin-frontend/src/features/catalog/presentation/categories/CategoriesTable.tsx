import type { JSX } from 'react'
import type { Category } from '@/features/catalog/domain/entities/Category'
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
import type { AsyncState } from '@/shared/presentation/hooks/useAsync'
import type { UiError } from '@/shared/application/UiError'

export interface CategoriesTableProps {
  categories: readonly Category[]
  listState: AsyncState<readonly Category[], UiError>
  hasActiveSearch: boolean
  onRetry: () => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

export function CategoriesTable({
  categories,
  listState,
  hasActiveSearch,
  onRetry,
  onEdit,
  onDelete,
}: CategoriesTableProps): JSX.Element {
  return (
    <div className="mt-6">
      <CollectionFeedback
        state={listState}
        loadingMessage="Carregando categorias…"
        loadErrorMessage="Não foi possível carregar as categorias"
        refreshErrorMessage="Não foi possível atualizar a lista de categorias"
        emptyMessage={
          hasActiveSearch
            ? 'Nenhuma categoria encontrada para essa busca.'
            : 'Nenhuma categoria ainda. Crie uma para começar.'
        }
        onRetry={onRetry}
      />

      {categories.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(category => (
                <TableRow key={category.id}>
                  <TableCell>
                    <span className="font-medium text-foreground">{category.name}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onEdit(category)
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onDelete(category)
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
