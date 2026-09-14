import { useLoaderData } from 'react-router';
import { useState } from 'react';
import type { Tag } from '../../../model/tag';
import type { tagsLoader } from './route';

type DialogState =
  { kind: 'none' } | { kind: 'create' } | { kind: 'edit'; tag: Tag } | { kind: 'delete'; tag: Tag };

export function useTagsPage() {
  const { tags, query } = useLoaderData<typeof tagsLoader>();
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });

  return {
    tags,
    query,
    isEmptyCatalog: tags.length === 0 && query === '',
    isEmptySearch: tags.length === 0 && query !== '',
    dialog,
    openCreateDialog: () => setDialog({ kind: 'create' }),
    openEditDialog: (tag: Tag) => setDialog({ kind: 'edit', tag }),
    openDeleteDialog: (tag: Tag) => setDialog({ kind: 'delete', tag }),
    closeDialog: () => setDialog({ kind: 'none' }),
  };
}
