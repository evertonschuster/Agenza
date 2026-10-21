import { AlertCircleIcon } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

export function FormErrorBanner() {
  const {
    formState: { errors },
  } = useFormContext();
  const serverError = errors.root?.serverError;
  if (!serverError?.message) return null;
  const code = serverError.type === 'server' ? undefined : serverError.type;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>
        <p>{serverError.message}</p>
        {code && <p className="mt-1 text-xs text-muted-foreground">Código: {code}</p>}
      </div>
    </div>
  );
}
