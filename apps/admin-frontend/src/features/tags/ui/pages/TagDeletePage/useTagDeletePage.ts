import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useCloseRoute } from '@/shared/hooks/useCloseRoute';
import { toast } from '@/shared/ui/toast';
import { tagsRepository } from '../../../api/tagsRepository';
import { deleteTag } from '../../../application/tagUseCases';
import type { Tag } from '../../../model/tag';
import { TAGS_PATH } from '../../tagsPaths';
import type { UseTagDeletePageResult } from './useTagDeletePage.types';

export function useTagDeletePage(): UseTagDeletePageResult {
  const { id = '' } = useParams();
  const close = useCloseRoute(TAGS_PATH);
  const [tag, setTag] = useState<Tag>();

  useEffect(() => {
    const controller = new AbortController();

    void tagsRepository.get(id, controller.signal).then((result) => {
      if (controller.signal.aborted) return;

      if (result.ok) {
        setTag(result.data);
        return;
      }

      toast.serverError('Não foi possível abrir a etiqueta', result.error);
      close();
    });

    return () => {
      controller.abort();
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
