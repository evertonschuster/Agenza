import type { ComponentProps } from 'react';
import { ExternalLinkIcon } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/utils';

export function NewTabLink({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, 'target' | 'rel'>) {
  return (
    <Link
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className,
      )}
    >
      {children}
      <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
    </Link>
  );
}
