import * as React from 'react';
import { cn } from '@/shared/lib/utils';

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="dialog-header" className={cn('flex flex-col gap-2', className)} {...props} />
  );
}

export { DialogHeader };
