import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { tagsRepository } from '../../../api/tagsRepository';
import type { ListSectionStatus } from '@/shared/ui/list-section';
import type { Tag } from '../../../model/tag';

type DialogState =
  { kind: 'none' } | { kind: 'create' } | { kind: 'edit'; tag: Tag } | { kind: 'delete'; tag: Tag };

export function useTagsPage() {
  const navigate = useNavigate();
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ListSectionStatus>('loading');
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    (nextQuery: string) =>
      tagsRepository.list(nextQuery || undefined).then((result) => {
        if (result.ok) {
          setTags(result.data);
          setStatus('ready');
        } else if (
          result.error.code === 'Session.Missing' ||
          result.error.code === 'Authorization.Unauthorized'
        ) {
          void navigate('/login', { replace: true });
        } else {
          setStatus('error');
        }
      }),
    [navigate],
  );

  useEffect(() => {
    void load('');
  }, [load]);

  function submitSearch() {
    const nextQuery = searchInputRef.current?.value ?? '';
    setQuery(nextQuery);
    setStatus('loading');
    void load(nextQuery);
  }

  function refresh() {
    setStatus('loading');
    void load(query);
  }

  return {
    tags,
    status,
    searchInputRef,
    dialog,
    submitSearch,
    refresh,
    openCreateDialog: () => setDialog({ kind: 'create' }),
    openEditDialog: (tag: Tag) => setDialog({ kind: 'edit', tag }),
    openDeleteDialog: (tag: Tag) => setDialog({ kind: 'delete', tag }),
    closeDialog: () => setDialog({ kind: 'none' }),
  };
}
