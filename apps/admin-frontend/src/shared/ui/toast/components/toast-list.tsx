import { Toast as ToastPrimitive } from '@base-ui/react/toast';

import { Toast } from '..';
import { ToastContent } from './toast-content';
import { ToastIcon } from './toast-icon';
import { ToastTitle } from './toast-title';
import { ToastDescription } from './toast-description';
import { ToastAction } from './toast-action';
import { ToastClose } from './toast-close';

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem}>
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction />
        <ToastClose />
      </ToastContent>
    </Toast>
  ));
}

export { ToastList };
