import { PlusIcon, SearchIcon } from 'lucide-react';
import { Form } from 'react-router';
import { Button } from '@/shared/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';
import { Kbd } from '@/shared/ui/kbd';
import { useShortcut } from '@/shared/keyboard/useShortcut';
import { useShortcutHint } from '@/shared/keyboard/shortcuts';
import { TagRow } from './TagRow';
import { TagFormDialog } from './TagFormDialog';
import { DeleteTagDialog } from './DeleteTagDialog';
import { useTagsPage } from './useTagsPage';

export function TagsPage() {
  const {
    tags,
    query,
    isEmptyCatalog,
    isEmptySearch,
    dialog,
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    closeDialog,
  } = useTagsPage();

  const newTagHint = useShortcutHint('nova-etiqueta');
  useShortcut('nova-etiqueta', 'n', 'Nova etiqueta', openCreateDialog);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Etiquetas</h1>
        <Button onClick={openCreateDialog}>
          <PlusIcon aria-hidden="true" />
          <span>Nova etiqueta</span>
          {newTagHint.visible && <Kbd className="ml-auto">{newTagHint.displayKey}</Kbd>}
        </Button>
      </div>

      <Form method="get" role="search">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            key={query}
            name="q"
            defaultValue={query}
            placeholder="Buscar etiquetas por nome..."
            aria-label="Buscar etiquetas por nome"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton type="submit">Buscar</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Form>

      {isEmptyCatalog && (
        <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm font-medium">Nenhuma etiqueta cadastrada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie a primeira etiqueta para começar a organizar seus serviços.
          </p>
        </div>
      )}

      {isEmptySearch && (
        <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm font-medium">Nenhuma etiqueta encontrada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Nenhum resultado para "{query}". Tente outro termo.
          </p>
        </div>
      )}

      {tags.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} onEdit={openEditDialog} onDelete={openDeleteDialog} />
          ))}
        </div>
      )}

      {(dialog.kind === 'create' || dialog.kind === 'edit') && (
        <TagFormDialog
          tag={dialog.kind === 'edit' ? dialog.tag : null}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
        />
      )}

      {dialog.kind === 'delete' && (
        <DeleteTagDialog
          tag={dialog.tag}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
        />
      )}
    </div>
  );
}
