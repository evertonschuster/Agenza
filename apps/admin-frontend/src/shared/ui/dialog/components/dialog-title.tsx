import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from '@/shared/lib/utils';

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-base leading-none font-medium', className)}
      {...props}
    />
  );
}

export { DialogTitle };
