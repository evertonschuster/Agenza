import * as React from 'react';
import { cn } from '@/shared/lib/utils';

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={cn('px-(--card-spacing)', className)} {...props} />
  );
}

export { CardContent };
