import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { toast } from '@/shared/ui/toast';
import { tagsRepository } from '../../../api/tagsRepository';
import { deleteTag } from '../../../application/tagUseCases';
import type { Tag } from '../../../model/tag';
import type { UseTagDeletePageResult } from './useTagDeletePage.types';

export function useTagDeletePage(): UseTagDeletePageResult {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<{ id: string; tag: Tag }>();
  const tag = loaded?.id === id ? loaded.tag : undefined;

  // Going back instead of pushing /tags keeps the browser's Back from reopening a closed dialog;
  // a first history entry (deep link, new tab) has nothing to go back to, so it is replaced.
  const close = useCallback(() => {
    if (location.key === 'default') {
      void navigate({ pathname: '/tags', search: location.search }, { replace: true });
      return;
    }
    void navigate(-1);
  }, [navigate, location.key, location.search]);

  useEffect(() => {
    let ignore = false;

    void tagsRepository.get(id).then((result) => {
      if (ignore) return;

      if (result.ok) {
        setLoaded({ id, tag: result.data });
        return;
      }

      toast.add({
        title: 'Não foi possível abrir a etiqueta',
        description: result.error.title ?? undefined,
        type: 'info',
      });
      close();
    });

    return () => {
      ignore = true;
    };
  }, [id, close]);

  return {
    tag,
    onOpenChange: (open) => {
      if (!open) close();
    },
    onConfirm: () => deleteTag(id),
  };
}
