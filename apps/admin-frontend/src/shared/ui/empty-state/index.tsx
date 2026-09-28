import { cn } from '@/shared/lib/utils';
import type { EmptyStateProps } from './empty-state.types';

function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-border px-6 py-14 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon aria-hidden="true" className="size-5" />
        </div>
      )}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
