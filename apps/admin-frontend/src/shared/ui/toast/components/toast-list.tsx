import { Toast as ToastPrimitive } from '@base-ui/react/toast';

import { Toast } from '..';
import { ProblemCode } from '@/shared/ui/problem-code';
import type { ToastData } from '../toast.types';
import { ToastIcon } from './toast-icon';
import {
  ToastContent,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
} from './toast-primitives';

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager<ToastData>();

  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem}>
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ToastTitle />
          <ToastDescription />
          <ProblemCode code={toastItem.data?.code} />
        </div>
        <ToastAction />
        <ToastClose />
      </ToastContent>
    </Toast>
  ));
}

export { ToastList };
