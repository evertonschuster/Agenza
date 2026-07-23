import type { JSX } from 'react'
import { PageHeader } from '@/shared/presentation/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTagsPage } from '@/features/catalog/presentation/tags/useTagsPage'
import { TagsTable } from '@/features/catalog/presentation/tags/TagsTable'
import { TagEditorDialog } from '@/features/catalog/presentation/tags/TagEditorDialog'
import { TagDeleteDialog } from '@/features/catalog/presentation/tags/TagDeleteDialog'

export function TagsPage(): JSX.Element {
  const {
    searchInput,
    onSearchInputChange,
    tags,
    status,
    error,
    hasActiveSearch,
    onRetry,
    onOpenCreate,
    onEdit,
    onDelete,
    dialog,
    deleteDialog,
  } = useTagsPage()

  return (
    <div>
      <PageHeader
        title="Etiquetas"
        action={<Button onClick={onOpenCreate}>Nova etiqueta</Button>}
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
        status={status}
        error={error}
        hasActiveSearch={hasActiveSearch}
        onRetry={onRetry}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <TagEditorDialog {...dialog} />

      <TagDeleteDialog {...deleteDialog} />
    </div>
  )
}
