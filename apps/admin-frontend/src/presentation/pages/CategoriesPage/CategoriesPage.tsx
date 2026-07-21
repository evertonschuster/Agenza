import { useState, type JSX } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useCategories } from '../../hooks/useCategories'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { Category } from '../../../domain/entities/Category'
import {
  CategoryForm,
  type CategoryFormValues,
  type CategoryFormField,
} from '../../forms/CategoryForm'
import { mapApiErrorToForm, type ServerFormError } from '../../forms/serverFormError'
import { categoryFieldMap, categoryCodeFieldMap } from '../../forms/fieldMaps'
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

const EMPTY_FORM_VALUES: CategoryFormValues = { name: '' }

type FormTarget = 'new' | Category

function toCategoryInput(values: CategoryFormValues): { name: string } {
  return { name: values.name }
}

function toFormValues(category: Category): CategoryFormValues {
  return { name: category.name }
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function CategoriesPage(): JSX.Element {
  const { tenantContext } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const { categories, status, error, refetch, createCategory, updateCategory, deleteCategory } =
    useCategories(tenantContext, debouncedSearch)

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)
  const [displayTarget, setDisplayTarget] = useState<FormTarget | null>(null)
  const [serverError, setServerError] = useState<ServerFormError<CategoryFormField> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function openCreateForm(): void {
    setFormTarget('new')
    setDisplayTarget('new')
    setServerError(null)
  }

  function openEditForm(category: Category): void {
    setFormTarget(category)
    setDisplayTarget(category)
    setServerError(null)
  }

  function closeForm(): void {
    // displayTarget is intentionally left as-is: Dialog fades out over ~100ms
    // after `open` flips to false, and clearing displayTarget here would
    // blank the title/form during that animation instead of after it.
    setFormTarget(null)
    setServerError(null)
  }

  async function handleSubmit(values: CategoryFormValues): Promise<void> {
    setIsSubmitting(true)
    setServerError(null)
    try {
      if (formTarget === 'new') {
        await createCategory(toCategoryInput(values))
      } else if (formTarget !== null) {
        await updateCategory(formTarget.id, toCategoryInput(values))
      }
      closeForm()
    } catch (caughtError) {
      setServerError(
        mapApiErrorToForm(
          caughtError,
          categoryFieldMap,
          categoryCodeFieldMap,
          'Não foi possível salvar a categoria.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function requestDelete(category: Category): void {
    setDeleteTarget(category)
    setDeleteError(null)
  }

  async function confirmDelete(): Promise<void> {
    if (deleteTarget === null) {
      return
    }
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteCategory(deleteTarget.id)
      setDeleteTarget(null)
    } catch (caughtError) {
      setDeleteError(messageFrom(caughtError, 'Não foi possível excluir a categoria.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Categorias"
        action={<Button onClick={openCreateForm}>Nova categoria</Button>}
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

      <div className="mt-6">
        {status === 'loading' && categories.length === 0 && (
          <StatusMessage>Carregando categorias…</StatusMessage>
        )}

        {status === 'error' && categories.length === 0 && (
          <StatusMessage tone="error">
            Não foi possível carregar as categorias
            {error instanceof Error ? `: ${error.message}` : '.'}
          </StatusMessage>
        )}

        {/* A refresh that fails after categories were already loaded (e.g.
            right after a successful create/update/delete) keeps showing the
            last known-good list instead of a blocking error - the mutation
            itself already succeeded, only the sync afterward failed. */}
        {status === 'error' && categories.length > 0 && (
          <StatusMessage tone="error">
            Não foi possível atualizar a lista de categorias
            {error instanceof Error ? `: ${error.message}` : '.'} Mostrando os últimos dados
            carregados.{' '}
            <button type="button" onClick={() => void refetch()} className="underline">
              Tentar novamente
            </button>
          </StatusMessage>
        )}

        {status === 'success' && categories.length === 0 && (
          <StatusMessage>
            {debouncedSearch.trim() === ''
              ? 'Nenhuma categoria ainda. Crie uma para começar.'
              : 'Nenhuma categoria encontrada para essa busca.'}
          </StatusMessage>
        )}

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
                            openEditForm(category)
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            requestDelete(category)
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
              {displayTarget === 'new' ? 'Nova categoria' : 'Editar categoria'}
            </DialogTitle>
          </DialogHeader>
          {displayTarget !== null && (
            <CategoryForm
              key={displayTarget === 'new' ? 'new' : displayTarget.id}
              initialValues={
                displayTarget === 'new' ? EMPTY_FORM_VALUES : toFormValues(displayTarget)
              }
              submitLabel={displayTarget === 'new' ? 'Criar categoria' : 'Salvar alterações'}
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
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{deleteTarget?.name}"? Essa ação não pode
              ser desfeita.
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
