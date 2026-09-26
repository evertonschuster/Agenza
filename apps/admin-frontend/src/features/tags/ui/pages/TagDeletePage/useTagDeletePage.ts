import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from '@/shared/ui/toast';
import { tagsRepository } from '../../../api/tagsRepository';
import type { Tag } from '../../../model/tag';
import { tagDeleted } from '../../../model/tagEvents';
import type { UseTagDeletePageResult } from './useTagDeletePage.types';

export function useTagDeletePage(): UseTagDeletePageResult | null {
  const location = useLocation();
  const navigate = useNavigate();
  const tag = location.state as Tag | undefined;

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
    if (tag) return;
    toast.add({
      title: 'Etiqueta não encontrada',
      description: 'Ela pode ter sido excluída por outra pessoa, ou não corresponde à busca ativa.',
      type: 'info',
    });
    close();
  }, [tag, close]);

  if (!tag) return null;

  return {
    tag,
    onOpenChange: (open) => {
      if (!open) close();
    },
    onConfirm: async () => {
      const result = await tagsRepository.delete(tag.id);
      if (result.ok) tagDeleted.publish({ id: tag.id });
      return result;
    },
  };
}
