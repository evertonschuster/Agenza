import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Tag } from '../../../model/tag';

export type UseTagDeletePageResult =
  | { mode: 'not-found'; onClose: () => void }
  | {
      mode: 'confirming';
      tag: Tag;
      onOpenChange: (open: boolean) => void;
      onConfirm: () => Promise<ApiResult<void>>;
    };
