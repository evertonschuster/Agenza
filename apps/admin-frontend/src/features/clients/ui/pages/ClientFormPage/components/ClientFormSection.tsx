import { useId, type ReactNode } from 'react';

interface ClientFormSectionProps {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}

function ClientFormSection({ title, description, action, children }: ClientFormSectionProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-xl border border-border bg-card p-4 text-card-foreground md:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 id={headingId} className="text-base font-semibold">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export { ClientFormSection };
