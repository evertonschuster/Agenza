import { useEffect, useState, type JSX } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { PageHeader } from '@/shared/presentation/components/screens/PageHeader'
import { Button } from '@/components/ui/button'
import { DebouncedSearchInput } from '@/shared/presentation/components/search/DebouncedSearchInput'
import { DeleteConfirmationDialog } from '@/shared/presentation/components/feedback/DeleteConfirmationDialog'
import { useCategoriesListPage } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategoriesListPage'
import { useCategoryDeletion } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategoryDeletion'
import { CategoriesTable } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/components/CategoriesTable'
import type { Category } from '@/features/catalog/domain/entities/Category'

export function CategoriesListPage(): JSX.Element {

  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const deletion = useCategoryDeletion()
  const { categories,  load } = useCategoriesListPage()

  useEffect(() => {
    void load(search)
  }, [search])

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
            onDebouncedChange={setSearch}
          />
        </div>

        <CategoriesTable
          categories={categories}
          onEdit={handleEdit}
          onDelete={deletion.onRequestDelete}
        />
      </div>

      <Outlet />

      <DeleteConfirmationDialog
        isOpen={deletion.isOpen}
        entityName={deletion.entityName}
        entityType={deletion.entityType}
        onCancel={deletion.onCancel}
        onConfirm={deletion.onConfirm}
      />
    </>
  )
}
