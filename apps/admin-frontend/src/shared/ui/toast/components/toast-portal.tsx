import { Toast as ToastPrimitive } from '@base-ui/react/toast';

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />;
}

export { ToastPortal };
