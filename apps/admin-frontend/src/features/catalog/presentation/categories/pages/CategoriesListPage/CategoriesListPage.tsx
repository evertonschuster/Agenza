import { useState, type JSX } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { PageHeader } from '@/shared/presentation/components/screens/PageHeader'
import { Button } from '@/components/ui/button'
import { DebouncedSearchInput } from '@/shared/presentation/components/search/DebouncedSearchInput'
import { DeleteConfirmationDialog } from '@/shared/presentation/components/feedback/DeleteConfirmationDialog'
import { useCategoriesListPage } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategoriesListPage'
import { CategoriesTable } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/components/CategoriesTable'
import type { Category } from '@/features/catalog/domain/entities/Category'

export function CategoriesListPage(): JSX.Element {
  const navigate = useNavigate()
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const hasActiveSearch = debouncedSearch.trim() !== ''
  const { categories, listState, onRetry, onDelete, deleteDialog } =
    useCategoriesListPage(debouncedSearch)

  function handleEdit(category: Category): void {
    void navigate(`/categories/${category.id}/edit`)
  }

  return (
    <>
      <div>
        <PageHeader
          title="Categorias"
          action={
            <Button
              onClick={() => {
                void navigate('/categories/new')
              }}
            >
              Nova categoria
            </Button>
          }
        />

        <div className="mt-4 max-w-sm">
          <DebouncedSearchInput
            type="search"
            aria-label="Buscar categoria por nome"
            placeholder="Buscar por nome…"
            onDebouncedChange={setDebouncedSearch}
          />
        </div>

        <CategoriesTable
          categories={categories}
          listState={listState}
          hasActiveSearch={hasActiveSearch} 
          onRetry={onRetry}
          onEdit={handleEdit}
          onDelete={onDelete}
        />
      </div>

      <Outlet />

      <DeleteConfirmationDialog
        isOpen={deleteDialog.target !== null}
        entityName={deleteDialog.target?.name ?? ''}
        entityType="a categoria"
        error={deleteDialog.error}
        isDeleting={deleteDialog.isDeleting}
        onCancel={deleteDialog.onCancel}
        onConfirm={deleteDialog.onConfirm}
      />
    </>
  )
}
