import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Tag } from '../../../model/tag';

export interface UseTagDeletePageResult {
  tag: Tag | undefined;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<ApiResult<void>>;
}
