import { cn } from '@/shared/lib/utils';
import type { OptionalTextProps } from './optional-text.types';

function OptionalText({ value, fallback, className }: OptionalTextProps) {
  if (value !== null && value !== undefined) {
    return <span className={className}>{value}</span>;
  }

  if (fallback) {
    return <span className={cn('italic opacity-70', className)}>{fallback}</span>;
  }

  return (
    <>
      <span aria-hidden="true" className={cn('text-muted-foreground', className)}>
        —
      </span>
      <span className="sr-only">Não informado</span>
    </>
  );
}

export { OptionalText };
export type { OptionalTextProps };
