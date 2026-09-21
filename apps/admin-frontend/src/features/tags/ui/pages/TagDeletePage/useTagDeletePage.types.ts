import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Tag } from '../../../model/tag';

export const TagDeleteMode = {
  NotFound: 'not-found',
  Confirming: 'confirming',
} as const;

export type UseTagDeletePageResult =
  | { mode: typeof TagDeleteMode.NotFound; onClose: () => void }
  | {
      mode: typeof TagDeleteMode.Confirming;
      tag: Tag;
      onOpenChange: (open: boolean) => void;
      onConfirm: () => Promise<ApiResult<void>>;
    };
