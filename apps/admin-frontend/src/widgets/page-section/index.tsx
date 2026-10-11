import { useId, type ReactNode } from 'react';

interface PageSectionBase {
  title: string;
  children: ReactNode;
}

interface PageSectionWithHeader extends PageSectionBase {
  hideTitle?: false;
  description?: string;
  action?: ReactNode;
}

interface PageSectionWithoutHeader extends PageSectionBase {
  hideTitle: true;
}

type PageSectionProps = PageSectionWithHeader | PageSectionWithoutHeader;

function PageSection(props: PageSectionProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-xl border border-border bg-card p-4 text-card-foreground md:p-6"
    >
      {props.hideTitle ? (
        <h2 id={headingId} className="sr-only">
          {props.title}
        </h2>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 id={headingId} className="text-base font-semibold">
              {props.title}
            </h2>
            {props.description && (
              <p className="text-sm text-muted-foreground">{props.description}</p>
            )}
          </div>
          {props.action && <div className="shrink-0">{props.action}</div>}
        </div>
      )}
      {props.children}
    </section>
  );
}

export { PageSection };
export type { PageSectionProps };
