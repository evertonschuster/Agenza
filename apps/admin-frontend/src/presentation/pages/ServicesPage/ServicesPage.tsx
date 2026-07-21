import { useEffect, useState, type JSX } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useServices } from '../../hooks/useServices'
import { useCategories } from '../../hooks/useCategories'
import { useTags } from '../../hooks/useTags'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { Service } from '../../../domain/entities/Service'
import type {
  CreateServiceInput,
  UpdateServiceInput,
} from '../../../application/repositories/ServiceRepository'
import { ServiceForm, type ServiceFormValues } from './ServiceForm'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const ALL_CATEGORIES_VALUE = '__all_categories__'
const ALL_TAGS_VALUE = '__all_tags__'

const EMPTY_FORM_VALUES: ServiceFormValues = {
  name: '',
  description: '',
  durationMinutes: '',
  minDurationMinutes: '',
  maxDurationMinutes: '',
  price: '',
  maxDiscountPercentage: '',
  categoryId: '',
  tagIds: [],
}

type FormTarget = 'new' | Service

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function formatPrice(price: number): string {
  return currencyFormatter.format(price)
}

function formatDuration(service: Service): string {
  const duration = String(service.durationMinutes)
  const min = String(service.minDurationMinutes)
  const max = String(service.maxDurationMinutes)
  return `${duration} min (${min}–${max})`
}

function toServiceInput(values: ServiceFormValues): CreateServiceInput | UpdateServiceInput {
  const description = values.description.trim()
  return {
    name: values.name.trim(),
    description: description !== '' ? description : null,
    durationMinutes: Number(values.durationMinutes),
    minDurationMinutes: Number(values.minDurationMinutes),
    maxDurationMinutes: Number(values.maxDurationMinutes),
    price: Number(values.price),
    maxDiscountPercentage: Number(values.maxDiscountPercentage),
    categoryId: values.categoryId !== '' ? values.categoryId : null,
    tagIds: values.tagIds,
  }
}

function toFormValues(service: Service): ServiceFormValues {
  return {
    name: service.name,
    description: service.description ?? '',
    durationMinutes: String(service.durationMinutes),
    minDurationMinutes: String(service.minDurationMinutes),
    maxDurationMinutes: String(service.maxDurationMinutes),
    price: String(service.price),
    maxDiscountPercentage: String(service.maxDiscountPercentage),
    categoryId: service.categoryId ?? '',
    tagIds: service.tags.map(tag => tag.id),
  }
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function ServicesPage(): JSX.Element {
  const { tenantContext } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const {
    services,
    status,
    error,
    page,
    pageSize,
    totalCount,
    setPage,
    createService,
    updateService,
    deleteService,
  } = useServices(tenantContext, {
    search: debouncedSearch,
    ...(categoryFilter !== '' ? { categoryId: categoryFilter } : {}),
    ...(tagFilter !== '' ? { tagId: tagFilter } : {}),
  })
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const { categories, createCategory } = useCategories(tenantContext)
  const { tags, createTag } = useTags(tenantContext)

  useEffect(() => {
    setPage(1)
    // Only re-run when a filter narrows the result set - setPage/page
    // themselves aren't inputs to this reset, they're what it resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, categoryFilter, tagFilter])

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)
  const [displayTarget, setDisplayTarget] = useState<FormTarget | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function openCreateForm(): void {
    setFormTarget('new')
    setDisplayTarget('new')
    setFormError(null)
  }

  function openEditForm(service: Service): void {
    setFormTarget(service)
    setDisplayTarget(service)
    setFormError(null)
  }

  function closeForm(): void {
    // displayTarget is intentionally left as-is: Dialog fades out over ~100ms
    // after `open` flips to false, and clearing displayTarget here would
    // blank the title/form during that animation instead of after it.
    setFormTarget(null)
    setFormError(null)
  }

  async function handleSubmit(values: ServiceFormValues): Promise<void> {
    setIsSubmitting(true)
    setFormError(null)
    try {
      if (formTarget === 'new') {
        await createService(toServiceInput(values))
      } else if (formTarget !== null) {
        await updateService(formTarget.id, toServiceInput(values))
      }
      closeForm()
    } catch (caughtError) {
      setFormError(messageFrom(caughtError, 'Não foi possível salvar o serviço.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  function requestDelete(service: Service): void {
    setDeleteTarget(service)
    setDeleteError(null)
  }

  async function confirmDelete(): Promise<void> {
    if (deleteTarget === null) {
      return
    }
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteService(deleteTarget.id)
      setDeleteTarget(null)
    } catch (caughtError) {
      setDeleteError(messageFrom(caughtError, 'Não foi possível excluir o serviço.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Serviços"
        action={<Button onClick={openCreateForm}>Novo serviço</Button>}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Input
          type="search"
          aria-label="Buscar serviço por nome"
          placeholder="Buscar por nome…"
          className="max-w-sm"
          value={searchInput}
          onChange={event => {
            setSearchInput(event.target.value)
          }}
        />
        <Select
          value={categoryFilter === '' ? ALL_CATEGORIES_VALUE : categoryFilter}
          onValueChange={value => {
            setCategoryFilter(value === ALL_CATEGORIES_VALUE ? '' : value)
          }}
        >
          <SelectTrigger aria-label="Filtrar por categoria" className="w-48">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES_VALUE}>Todas as categorias</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={tagFilter === '' ? ALL_TAGS_VALUE : tagFilter}
          onValueChange={value => {
            setTagFilter(value === ALL_TAGS_VALUE ? '' : value)
          }}
        >
          <SelectTrigger aria-label="Filtrar por etiqueta" className="w-48">
            <SelectValue placeholder="Todas as etiquetas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TAGS_VALUE}>Todas as etiquetas</SelectItem>
            {tags.map(tag => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        {status === 'loading' && <StatusMessage>Carregando serviços…</StatusMessage>}

        {status === 'error' && (
          <StatusMessage tone="error">
            Não foi possível carregar os serviços
            {error instanceof Error ? `: ${error.message}` : '.'}
          </StatusMessage>
        )}

        {status === 'success' && services.length === 0 && (
          <StatusMessage>
            {debouncedSearch.trim() === '' && categoryFilter === '' && tagFilter === ''
              ? 'Nenhum serviço ainda. Crie um para começar.'
              : 'Nenhum serviço encontrado para esses filtros.'}
          </StatusMessage>
        )}

        {status === 'success' && services.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Desconto máx.</TableHead>
                  <TableHead>Etiquetas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map(service => (
                  <TableRow key={service.id}>
                    <TableCell className="text-muted-foreground">{service.code}</TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">{service.name}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {service.categoryName ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(service)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPrice(service.price)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {service.maxDiscountPercentage}%
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {service.tags.length === 0 && (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {service.tags.map(tag => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-foreground"
                          >
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: tag.color }}
                              aria-hidden="true"
                            />
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            openEditForm(service)
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            requestDelete(service)
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

        {status === 'success' && services.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage(page - 1)
                }}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage(page + 1)
                }}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={formTarget !== null}
        onOpenChange={open => {
          if (!open) closeForm()
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{displayTarget === 'new' ? 'Novo serviço' : 'Editar serviço'}</DialogTitle>
          </DialogHeader>
          {displayTarget !== null && (
            <ServiceForm
              key={displayTarget === 'new' ? 'new' : displayTarget.id}
              code={displayTarget === 'new' ? null : displayTarget.code}
              initialValues={
                displayTarget === 'new' ? EMPTY_FORM_VALUES : toFormValues(displayTarget)
              }
              categories={categories}
              tags={tags}
              submitLabel={displayTarget === 'new' ? 'Criar serviço' : 'Salvar alterações'}
              isSubmitting={isSubmitting}
              error={formError}
              onCancel={closeForm}
              onSubmit={handleSubmit}
              onCreateCategory={createCategory}
              onCreateTag={createTag}
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
            <AlertDialogTitle>Excluir serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o serviço "{deleteTarget?.name}"? Essa ação não pode
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
