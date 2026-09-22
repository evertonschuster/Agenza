import { useEffect } from 'react';
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

  useEffect(() => {
    if (tag) return;
    toast.add({
      title: 'Etiqueta não encontrada',
      description: 'Ela pode ter sido excluída por outra pessoa, ou não corresponde à busca ativa.',
      type: 'info',
    });
    void navigate({ pathname: '/tags', search: location.search });
  }, [tag, navigate, location.search]);

  if (!tag) return null;

  const backTo = { pathname: '/tags', search: location.search };

  return {
    tag,
    onOpenChange: (open) => {
      if (!open) void navigate(backTo);
    },
    onConfirm: async () => {
      const result = await tagsRepository.delete(tag.id);
      if (result.ok) tagDeleted.publish({ id: tag.id });
      return result;
    },
  };
}
