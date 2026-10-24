import type { ReactNode } from 'react';

export interface PageCrumbHandle {
  crumb: string;
  hideInTrail?: boolean;
}

export interface PageCrumb {
  label: string;
  to: string;
  hideInTrail: boolean;
}

export interface PageHeaderProps {
  description?: string | undefined;
  titleAddon?: ReactNode;
  actions?: ReactNode;
}

export interface PageHeaderBackLinkProps {
  parent: PageCrumb;
}

export interface PageHeaderTrailProps {
  parents: readonly PageCrumb[];
  title: string;
}
