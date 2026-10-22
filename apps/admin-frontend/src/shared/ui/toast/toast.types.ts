import type { ApiProblem } from '@/shared/api/servicesFacade';

export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'loading';

export type ToastData = {
  problem?: ApiProblem | undefined;
};

export type ToastIconProps = {
  type: string | undefined;
};
