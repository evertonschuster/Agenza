import type { JSX } from 'react'
import { PageHeader } from '@/shared/presentation/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCategoriesPage } from '@/features/catalog/presentation/categories/useCategoriesPage'
import { CategoriesTable } from '@/features/catalog/presentation/categories/CategoriesTable'
import { CategoryEditorDialog } from '@/features/catalog/presentation/categories/CategoryEditorDialog'
import { CategoryDeleteDialog } from '@/features/catalog/presentation/categories/CategoryDeleteDialog'

export function CategoriesPage(): JSX.Element {
  const {
    searchInput,
    onSearchInputChange,
    categories,
    status,
    error,
    hasActiveSearch,
    onRetry,
    onOpenCreate,
    onEdit,
    onDelete,
    dialog,
    deleteDialog,
  } = useCategoriesPage()

  return (
    <div>
      <PageHeader
        title="Categorias"
        action={<Button onClick={onOpenCreate}>Nova categoria</Button>}
      />

      <div className="mt-4 max-w-sm">
        <Input
          type="search"
          aria-label="Buscar categoria por nome"
          placeholder="Buscar por nome…"
          value={searchInput}
          onChange={event => {
            onSearchInputChange(event.target.value)
          }}
        />
      </div>

      <CategoriesTable
        categories={categories}
        status={status}
        error={error}
        hasActiveSearch={hasActiveSearch}
        onRetry={onRetry}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <CategoryEditorDialog {...dialog} />

      <CategoryDeleteDialog {...deleteDialog} />
    </div>
  )
}
