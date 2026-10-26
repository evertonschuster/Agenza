import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Client } from '../../../model/client';

export interface UseClientDeletePageResult {
  client: Client | undefined;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<ApiResult<void>>;
}
