import { useLoaderData } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import type { Tag } from '../../../model/tag';
import type { tagsLoader } from './route';

type DialogState =
  { kind: 'none' } | { kind: 'create' } | { kind: 'edit'; tag: Tag } | { kind: 'delete'; tag: Tag };

export function useTagsPage() {
  const { tags, query } = useLoaderData<typeof tagsLoader>();
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.value = query;
    }
  }, [query]);

  return {
    tags,
    query,
    searchInputRef,
    isEmptyCatalog: tags.length === 0 && query === '',
    isEmptySearch: tags.length === 0 && query !== '',
    dialog,
    openCreateDialog: () => setDialog({ kind: 'create' }),
    openEditDialog: (tag: Tag) => setDialog({ kind: 'edit', tag }),
    openDeleteDialog: (tag: Tag) => setDialog({ kind: 'delete', tag }),
    closeDialog: () => setDialog({ kind: 'none' }),
  };
}
