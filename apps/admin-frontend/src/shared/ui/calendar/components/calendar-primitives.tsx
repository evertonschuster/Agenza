import type { ChevronProps, RootProps } from 'react-day-picker';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

function CalendarRoot({ className, rootRef, ...props }: RootProps) {
  return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />;
}

function CalendarChevron({ className, orientation, ...props }: ChevronProps) {
  if (orientation === 'left')
    return <ChevronLeftIcon className={cn('size-4', className)} {...props} />;
  if (orientation === 'right')
    return <ChevronRightIcon className={cn('size-4', className)} {...props} />;
  return <ChevronDownIcon className={cn('size-4', className)} {...props} />;
}

export { CalendarRoot, CalendarChevron };
