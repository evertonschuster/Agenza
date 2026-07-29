import { useState, type JSX } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { PageHeader } from '@/shared/presentation/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DeleteConfirmationDialog } from '@/shared/presentation/components/DeleteConfirmationDialog'
import { useDebouncedValue } from '@/shared/presentation/hooks/useDebouncedValue'
import { useCategoriesListPage } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategoriesListPage'
import { CategoriesTable } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/components/CategoriesTable'
import type { Category } from '@/features/catalog/domain/entities/Category'

export function CategoriesListPage(): JSX.Element {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const hasActiveSearch = debouncedSearch.trim() !== ''
  const { state, onRetry, onDelete, deleteDialog } = useCategoriesListPage(debouncedSearch)

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
          <Input
            type="search"
            aria-label="Buscar categoria por nome"
            placeholder="Buscar por nome…"
            value={searchInput}
            onChange={event => {
              setSearchInput(event.target.value)
            }}
          />
        </div>

        <CategoriesTable
          state={state}
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
