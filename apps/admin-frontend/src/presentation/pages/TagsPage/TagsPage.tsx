import { useState, type JSX } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTags } from '../../hooks/useTags'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { TAG_COLOR_PALETTE, type Tag, type TagColor } from '../../../domain/entities/Tag'
import { TagForm, type TagFormValues, type TagFormField } from '../../forms/TagForm'
import { mapApiErrorToForm, type ServerFormError } from '../../forms/serverFormError'
import { tagFieldMap, tagCodeFieldMap } from '../../forms/fieldMaps'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusMessage } from '../../components/StatusMessage'

const EMPTY_FORM_VALUES: TagFormValues = { name: '', color: TAG_COLOR_PALETTE[0], description: '' }

type FormTarget = 'new' | Tag

function toTagInput(values: TagFormValues): {
  name: string
  color: TagColor
  description?: string
} {
  const description = values.description.trim()
  return {
    name: values.name,
    color: values.color,
    ...(description !== '' ? { description } : {}),
  }
}

function toFormValues(tag: Tag): TagFormValues {
  return { name: tag.name, color: tag.color, description: tag.description ?? '' }
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function TagsPage(): JSX.Element {
  const { tenantContext } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const { tags, status, error, refetch, createTag, updateTag, deleteTag } = useTags(
    tenantContext,
    debouncedSearch,
  )

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)
  const [displayTarget, setDisplayTarget] = useState<FormTarget | null>(null)
  const [serverError, setServerError] = useState<ServerFormError<TagFormField> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function openCreateForm(): void {
    setFormTarget('new')
    setDisplayTarget('new')
    setServerError(null)
  }

  function openEditForm(tag: Tag): void {
    setFormTarget(tag)
    setDisplayTarget(tag)
    setServerError(null)
  }

  function closeForm(): void {
    // displayTarget is intentionally left as-is: Dialog fades out over ~100ms
    // after `open` flips to false, and clearing displayTarget here would
    // blank the title/form during that animation instead of after it.
    setFormTarget(null)
    setServerError(null)
  }

  async function handleSubmit(values: TagFormValues): Promise<void> {
    setIsSubmitting(true)
    setServerError(null)
    try {
      if (formTarget === 'new') {
        await createTag(toTagInput(values))
      } else if (formTarget !== null) {
        await updateTag(formTarget.id, toTagInput(values))
      }
      closeForm()
    } catch (caughtError) {
      setServerError(
        mapApiErrorToForm(
          caughtError,
          tagFieldMap,
          tagCodeFieldMap,
          'Não foi possível salvar a etiqueta.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function requestDelete(tag: Tag): void {
    setDeleteTarget(tag)
    setDeleteError(null)
  }

  async function confirmDelete(): Promise<void> {
    if (deleteTarget === null) {
      return
    }
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteTag(deleteTarget.id)
      setDeleteTarget(null)
    } catch (caughtError) {
      setDeleteError(messageFrom(caughtError, 'Não foi possível excluir a etiqueta.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Etiquetas"
        action={<Button onClick={openCreateForm}>Nova etiqueta</Button>}
      />

      <div className="mt-4 max-w-sm">
        <Input
          type="search"
          aria-label="Buscar etiqueta por nome"
          placeholder="Buscar por nome…"
          value={searchInput}
          onChange={event => {
            setSearchInput(event.target.value)
          }}
        />
      </div>

      <div className="mt-6">
        {status === 'loading' && tags.length === 0 && (
          <StatusMessage>Carregando etiquetas…</StatusMessage>
        )}

        {status === 'error' && tags.length === 0 && (
          <StatusMessage tone="error">
            Não foi possível carregar as etiquetas
            {error instanceof Error ? `: ${error.message}` : '.'}
          </StatusMessage>
        )}

        {/* A refresh that fails after tags were already loaded (e.g. right
            after a successful create/update/delete) keeps showing the last
            known-good list instead of a blocking error - the mutation itself
            already succeeded, only the sync afterward failed. */}
        {status === 'error' && tags.length > 0 && (
          <StatusMessage tone="error">
            Não foi possível atualizar a lista de etiquetas
            {error instanceof Error ? `: ${error.message}` : '.'} Mostrando os últimos dados
            carregados.{' '}
            <button type="button" onClick={() => void refetch()} className="underline">
              Tentar novamente
            </button>
          </StatusMessage>
        )}

        {status === 'success' && tags.length === 0 && (
          <StatusMessage>
            {debouncedSearch.trim() === ''
              ? 'Nenhuma etiqueta ainda. Crie uma para começar.'
              : 'Nenhuma etiqueta encontrada para essa busca.'}
          </StatusMessage>
        )}

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
                            openEditForm(tag)
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            requestDelete(tag)
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

      <Dialog
        open={formTarget !== null}
        onOpenChange={open => {
          if (!open) closeForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {displayTarget === 'new' ? 'Nova etiqueta' : 'Editar etiqueta'}
            </DialogTitle>
          </DialogHeader>
          {displayTarget !== null && (
            <TagForm
              key={displayTarget === 'new' ? 'new' : displayTarget.id}
              initialValues={
                displayTarget === 'new' ? EMPTY_FORM_VALUES : toFormValues(displayTarget)
              }
              submitLabel={displayTarget === 'new' ? 'Criar etiqueta' : 'Salvar alterações'}
              isSubmitting={isSubmitting}
              serverError={serverError}
              onCancel={closeForm}
              onSubmit={handleSubmit}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={open => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etiqueta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir a etiqueta "{deleteTarget?.name}"? Essa ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError !== null && <StatusMessage tone="error">{deleteError}</StatusMessage>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={event => {
                event.preventDefault()
                void confirmDelete()
              }}
            >
              {isDeleting ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
