import { Toast as ToastPrimitive } from '@base-ui/react/toast';

import { Toast } from '..';
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
          {toastItem.data?.code && (
            <p className="text-xs text-muted-foreground">Código: {toastItem.data.code}</p>
          )}
        </div>
        <ToastAction />
        <ToastClose />
      </ToastContent>
    </Toast>
  ));
}

export { ToastList };
