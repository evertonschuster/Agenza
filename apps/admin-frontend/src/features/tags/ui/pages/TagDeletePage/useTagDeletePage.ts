import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router';
import { tagsRepository } from '../../../api/tagsRepository';
import { findTagById } from '../../../model/tag';
import type { TagListOutletContext } from '../TagListPage/useTagListPage.types';
import type { UseTagDeletePageResult } from './useTagDeletePage.types';

export function useTagDeletePage(): UseTagDeletePageResult {
  const { id } = useParams<'id'>();
  const { tags, reload } = useOutletContext<TagListOutletContext>();
  const location = useLocation();
  const navigate = useNavigate();

  const tag = id ? findTagById(tags, id) : undefined;
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
      if (result.ok) reload();
      return result;
    },
  };
}
