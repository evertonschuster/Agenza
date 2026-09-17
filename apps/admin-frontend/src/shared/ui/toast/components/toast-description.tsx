import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import { cn } from '@/shared/lib/utils';

function ToastDescription({ className, ...props }: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export { ToastDescription };
