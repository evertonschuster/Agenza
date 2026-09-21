import { useLocation, useNavigate } from 'react-router';
import { tagsRepository } from '../../../api/tagsRepository';
import type { Tag } from '../../../model/tag';
import { tagDeleted } from '../../../model/tagEvents';
import type { UseTagDeletePageResult } from './useTagDeletePage.types';

export function useTagDeletePage(): UseTagDeletePageResult {
  const location = useLocation();
  const navigate = useNavigate();

  const tag = location.state as Tag | undefined;
  const backTo = { pathname: '..', search: location.search };

  if (!tag) {
    return { mode: 'not-found', onClose: () => void navigate(backTo) };
  }

  return {
    mode: 'confirming',
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
