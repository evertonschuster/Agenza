import { AlertCircleIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import type { ErrorStateProps } from './error-state.types';

function ErrorState({
  title,
  description,
  code,
  icon: Icon = AlertCircleIcon,
  retryLabel = 'Tentar novamente',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {code && <p className="mt-1 text-xs text-muted-foreground">Código: {code}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export { ErrorState };
export type { ErrorStateProps };
