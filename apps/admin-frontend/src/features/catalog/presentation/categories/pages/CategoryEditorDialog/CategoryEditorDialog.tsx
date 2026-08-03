import type { JSX } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CategoryForm } from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/forms/CategoryForm'
import { useCategoryEditor } from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/hooks/useCategoryEditor'
import { StatusMessage } from '@/shared/presentation/components/feedback/StatusMessage'

export function CategoryEditorDialog(): JSX.Element {
  const editor = useCategoryEditor()

  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) {
          editor.onCancel()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editor.title}</DialogTitle>
        </DialogHeader>

        {editor.content.status === 'loading' && (
          <StatusMessage tone="loading">Carregando categoria…</StatusMessage>
        )}

        {editor.content.status === 'loadError' && (
          <div className="space-y-3">
            <StatusMessage tone="error">
              Não foi possível carregar a categoria: {editor.content.message}
            </StatusMessage>
            <Button type="button" variant="outline" onClick={editor.content.onRetry}>
              Tentar novamente
            </Button>
          </div>
        )}

        {editor.content.status === 'notFound' && (
          <div className="space-y-3">
            <StatusMessage tone="error">Categoria não encontrada.</StatusMessage>
            <Button type="button" variant="outline" onClick={editor.onCancel}>
              Voltar para categorias
            </Button>
          </div>
        )}

        {editor.content.status === 'ready' && (
          <CategoryForm
            key={editor.formKey}
            initialValues={editor.content.initialValues}
            submitLabel={editor.submitLabel}
            isSubmitting={editor.isSubmitting}
            serverError={editor.serverError}
            onCancel={editor.onCancel}
            onSubmit={editor.onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
