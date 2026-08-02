import type { JSX } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { PageHeader } from '@/shared/presentation/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DeleteConfirmationDialog } from '@/shared/presentation/components/DeleteConfirmationDialog'
import { useTagsPage } from '@/features/catalog/presentation/tags/hooks/useTagsPage'
import { TagsTable } from '@/features/catalog/presentation/tags/components/TagsTable'

export function TagsPage(): JSX.Element {
  const navigate = useNavigate()
  const {
    searchInput,
    onSearchInputChange,
    tags,
    listState,
    hasActiveSearch,
    onRetry,
    editorContext,
    onDelete,
    deleteDialog,
  } = useTagsPage()

  function handleEdit(tag: (typeof tags)[number]): void {
    void navigate(`/tags/${tag.id}/edit`)
  }

  return (
    <>
      <div>
        <PageHeader
          title="Etiquetas"
          action={
            <Button
              onClick={() => {
                void navigate('/tags/new')
              }}
            >
              Nova etiqueta
            </Button>
          }
        />

        <div className="mt-4 max-w-sm">
          <Input
            type="search"
            aria-label="Buscar etiqueta por nome"
            placeholder="Buscar por nome…"
            value={searchInput}
            onChange={event => {
              onSearchInputChange(event.target.value)
            }}
          />
        </div>

        <TagsTable
          tags={tags}
          listState={listState}
          hasActiveSearch={hasActiveSearch}
          onRetry={onRetry}
          onEdit={handleEdit}
          onDelete={onDelete}
        />
      </div>

      <Outlet context={editorContext} />

      <DeleteConfirmationDialog
        isOpen={deleteDialog.target !== null}
        entityName={deleteDialog.target?.name ?? ''}
        entityType="a etiqueta"
        error={deleteDialog.error}
        isDeleting={deleteDialog.isDeleting}
        onCancel={deleteDialog.onCancel}
        onConfirm={deleteDialog.onConfirm}
      />
    </>
  )
}
