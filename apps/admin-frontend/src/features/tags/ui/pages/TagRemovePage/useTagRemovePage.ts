import {
  useLocation,
  useNavigate,
  useParams,
  useRevalidator,
  useRouteLoaderData,
} from 'react-router';
import type { ApiResult } from '@/shared/api/servicesFacade';
import { tagsRepository } from '../../../api/tagsRepository';
import { findTagById, type Tag } from '../../../model/tag';
import type { TagListLoaderData } from '../TagListPage/route';

export type TagRemovePageState =
  | { mode: 'not-found'; onClose: () => void }
  | {
      mode: 'confirming';
      tag: Tag;
      onOpenChange: (open: boolean) => void;
      onConfirm: () => Promise<ApiResult<void>>;
    };

export function useTagRemovePage(): TagRemovePageState {
  const { id } = useParams<'id'>();
  const listData = useRouteLoaderData<TagListLoaderData>('tags-list');
  const location = useLocation();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const tags = listData?.status === 'ready' ? listData.tags : [];
  const tag = id ? findTagById(tags, id) : undefined;
  const backTo = { pathname: '..', search: location.search };

  if (!tag) {
    return { mode: 'not-found', onClose: () => void navigate({ pathname: '..', search: '' }) };
  }

  return {
    mode: 'confirming',
    tag,
    onOpenChange: (open) => {
      if (!open) void navigate(backTo);
    },
    // ConfirmDialog awaits onConfirm() before it calls onOpenChange(false) — revalidating in here,
    // not in a fire-and-forget onSuccess, means it's fully settled (including its own self-triggered
    // reload of the current loader) before that close/navigate fires. Doing it the other way around
    // raced the two navigations and cost an extra loader call, confirmed by this hook's own test.
    onConfirm: async () => {
      const result = await tagsRepository.remove(tag.id);
      if (result.ok) {
        await revalidator.revalidate();
      }
      return result;
    },
  };
}
