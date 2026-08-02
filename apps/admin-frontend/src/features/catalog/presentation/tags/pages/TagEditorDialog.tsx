import type { JSX } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TagForm } from '@/features/catalog/presentation/tags/forms/TagForm'
import { useTagEditor } from '@/features/catalog/presentation/tags/hooks/useTagEditor'
import { StatusMessage } from '@/shared/presentation/components/StatusMessage'

export function TagEditorDialog(): JSX.Element {
  const editor = useTagEditor()

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
          <StatusMessage tone="loading">Carregando etiqueta…</StatusMessage>
        )}

        {editor.content.status === 'loadError' && (
          <div className="space-y-3">
            <StatusMessage tone="error">
              Não foi possível carregar a etiqueta: {editor.content.message}
            </StatusMessage>
            <Button type="button" variant="outline" onClick={editor.content.onRetry}>
              Tentar novamente
            </Button>
          </div>
        )}

        {editor.content.status === 'notFound' && (
          <div className="space-y-3">
            <StatusMessage tone="error">Etiqueta não encontrada.</StatusMessage>
            <Button type="button" variant="outline" onClick={editor.onCancel}>
              Voltar para etiquetas
            </Button>
          </div>
        )}

        {editor.content.status === 'ready' && (
          <TagForm
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
