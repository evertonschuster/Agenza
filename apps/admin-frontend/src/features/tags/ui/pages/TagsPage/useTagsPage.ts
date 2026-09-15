import { useEffect, useRef, useState } from 'react';
import { tagsRepository } from '../../../api/tagsRepository';
import { toast } from '@/shared/ui/toast';
import { extractErrorMessage, type ApiProblem } from '@/shared/api/servicesFacade';
import type { Tag } from '../../../model/tag';

type DialogState =
  { kind: 'none' } | { kind: 'create' } | { kind: 'edit'; tag: Tag } | { kind: 'delete'; tag: Tag };

function notifyLoadFailure(error: ApiProblem) {
  toast.add({
    title: 'Não foi possível carregar as etiquetas',
    description: extractErrorMessage(error),
    type: 'error',
  });
}

export function useTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void tagsRepository.list(undefined).then((result) => {
      if (result.ok) {
        setTags(result.data);
      } else {
        notifyLoadFailure(result.error);
      }
      setIsLoading(false);
    });
  }, []);

  async function search(nextQuery: string) {
    const result = await tagsRepository.list(nextQuery || undefined);
    if (result.ok) {
      setTags(result.data);
    } else {
      notifyLoadFailure(result.error);
    }
  }

  function submitSearch() {
    const nextQuery = searchInputRef.current?.value ?? '';
    setQuery(nextQuery);
    void search(nextQuery);
  }

  function refresh() {
    void search(query);
  }

  return {
    tags,
    query,
    isLoading,
    searchInputRef,
    isEmptyCatalog: !isLoading && tags.length === 0 && query === '',
    isEmptySearch: !isLoading && tags.length === 0 && query !== '',
    dialog,
    submitSearch,
    refresh,
    openCreateDialog: () => setDialog({ kind: 'create' }),
    openEditDialog: (tag: Tag) => setDialog({ kind: 'edit', tag }),
    openDeleteDialog: (tag: Tag) => setDialog({ kind: 'delete', tag }),
    closeDialog: () => setDialog({ kind: 'none' }),
  };
}
