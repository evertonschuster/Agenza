import { PageHeaderBackLink } from './components/page-header-back-link';
import { PageHeaderTrail } from './components/page-header-trail';
import type { PageHeaderProps } from './page-header.types';
import { usePageCrumbs } from './use-page-crumbs';

function PageHeader({ description, titleAddon, actions }: PageHeaderProps) {
  const crumbs = usePageCrumbs();
  const current = crumbs.at(-1);
  if (!current) throw new Error('PageHeader needs a matched route with handle.crumb.');

  const parents = crumbs.slice(0, -1);
  const parent = parents.at(-1);
  const shownParents = parents.filter((crumb) => !crumb.hideInTrail);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          {parent && <PageHeaderBackLink parent={parent} />}
          <PageHeaderTrail parents={shownParents} title={current.label} />
          {titleAddon}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export { PageHeader };
export type { PageCrumbHandle, PageHeaderProps } from './page-header.types';
