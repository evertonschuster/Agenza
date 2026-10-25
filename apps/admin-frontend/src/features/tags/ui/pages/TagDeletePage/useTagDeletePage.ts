import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { toast } from '@/shared/ui/toast';
import { tagsRepository } from '../../../api/tagsRepository';
import { deleteTag } from '../../../application/tagUseCases';
import type { Tag } from '../../../model/tag';
import { TAGS_PATH } from '../../tagsPaths';
import type { UseTagDeletePageResult } from './useTagDeletePage.types';

export function useTagDeletePage(): UseTagDeletePageResult {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [tag, setTag] = useState<Tag>();
  const canGoBack = location.key !== 'default';

  const close = useCallback(() => {
    if (canGoBack) {
      void navigate(-1);
      return;
    }
    void navigate(TAGS_PATH, { replace: true });
  }, [navigate, canGoBack]);

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
