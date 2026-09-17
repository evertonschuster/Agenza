import type { FullScreenMessageProps } from './FullScreenMessage.types';

function FullScreenMessage({ title, description, action }: FullScreenMessageProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-background p-6 text-center text-foreground">
      <p className="text-lg font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { FullScreenMessage };
