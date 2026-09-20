import { useLoaderData, useLocation, useNavigate, useRevalidator } from 'react-router';
import type { ApiResult } from '@/shared/api/servicesFacade';
import { tagsRepository } from '../../../api/tagsRepository';
import type { Tag, TagLoadResult } from '../../../model/tag';

export type TagRemovePageState =
  | { mode: 'not-found'; onClose: () => void }
  | { mode: 'error'; onClose: () => void; onRetry: () => void }
  | {
      mode: 'confirming';
      tag: Tag;
      onOpenChange: (open: boolean) => void;
      onConfirm: () => Promise<ApiResult<void>>;
    };

export function useTagRemovePage(): TagRemovePageState {
  // ':id/remove' always has tagByIdLoader wired, so this is never undefined here.
  const loaderData = useLoaderData<TagLoadResult>();
  const location = useLocation();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const backTo = { pathname: '..', search: location.search };

  if (loaderData.status === 'not-found') {
    return { mode: 'not-found', onClose: () => void navigate(backTo) };
  }

  if (loaderData.status === 'error') {
    return {
      mode: 'error',
      onClose: () => void navigate(backTo),
      onRetry: () => void revalidator.revalidate(),
    };
  }

  const { tag } = loaderData;

  return {
    mode: 'confirming',
    tag,
    onOpenChange: (open) => {
      if (!open) void navigate(backTo);
    },
    // ConfirmDialog awaits onConfirm() before it calls onOpenChange(false) — revalidating in here,
    // not in a fire-and-forget onSuccess, means it's fully settled (including its own self-triggered
    // reload of the current loaders) before that close/navigate fires. Doing it the other way around
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
