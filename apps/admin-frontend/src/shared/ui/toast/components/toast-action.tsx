import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import { cn } from '@/shared/lib/utils';

import { Button } from '@/shared/ui/button';

function ToastAction({
  className,
  render = <Button variant="outline" size="sm" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn('shrink-0', className)}
      {...props}
    />
  );
}

export { ToastAction };
