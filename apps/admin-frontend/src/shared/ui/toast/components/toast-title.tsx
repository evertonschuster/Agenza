import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import { cn } from '@/shared/lib/utils';

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn('text-sm font-medium', className)}
      {...props}
    />
  );
}

export { ToastTitle };
