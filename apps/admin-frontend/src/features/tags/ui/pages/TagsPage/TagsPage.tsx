import { PlusIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';
import { Kbd } from '@/shared/ui/kbd';
import { ListSection } from '@/shared/ui/list-section';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { useShortcut } from '@/shared/keyboard/useShortcut';
import { useShortcutHint } from '@/shared/keyboard/shortcuts';
import { extractErrorMessage } from '@/shared/api/servicesFacade';
import { tagColumns } from './tagColumns';
import { TagFormDialog } from './TagFormDialog';
import { DeleteTagDialog } from './DeleteTagDialog';
import { useTagsPage } from './useTagsPage';

export function TagsPage() {
  const {
    tags,
    query,
    status,
    error,
    searchInputRef,
    dialog,
    submitSearch,
    clearSearch,
    refresh,
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

      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
      >
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchInputRef}
            placeholder="Buscar etiquetas por nome..."
            aria-label="Buscar etiquetas por nome"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton type="submit">Buscar</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>

      {status === 'empty' &&
        (query === '' ? (
          <EmptyState
            title="Nenhuma etiqueta cadastrada"
            description="Crie a primeira etiqueta para começar a organizar seus serviços."
          />
        ) : (
          <EmptyState
            title="Nenhuma etiqueta encontrada"
            description={`Nenhum resultado para "${query}". Tente outro termo.`}
            action={
              <Button variant="outline" onClick={clearSearch}>
                Limpar busca
              </Button>
            }
          />
        ))}

      {status === 'error' && error && (
        <ErrorState
          title="Não foi possível carregar as etiquetas"
          description={extractErrorMessage(error)}
          code={error.code ?? undefined}
          onRetry={refresh}
        />
      )}

      {(status === 'loading' || status === 'ready') && (
        <ListSection
          status={status}
          items={tags}
          getKey={(tag) => tag.id}
          aria-label="Etiquetas"
          columns={tagColumns(openEditDialog, openDeleteDialog)}
        />
      )}

      {(dialog.kind === 'create' || dialog.kind === 'edit') && (
        <TagFormDialog
          tag={dialog.kind === 'edit' ? dialog.tag : null}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
          onSaved={refresh}
        />
      )}

      {dialog.kind === 'delete' && (
        <DeleteTagDialog
          tag={dialog.tag}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
          onDeleted={refresh}
        />
      )}
    </div>
  );
}
