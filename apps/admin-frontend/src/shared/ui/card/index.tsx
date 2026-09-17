import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import type { CardSize } from './card.types';

import { CardHeader } from './components/card-header';
import { CardFooter } from './components/card-footer';
import { CardTitle } from './components/card-title';
import { CardAction } from './components/card-action';
import { CardDescription } from './components/card-description';
import { CardContent } from './components/card-content';

function Card({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & { size?: CardSize }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
