import type { ReactNode } from 'react';

type ListSectionStatus = 'loading' | 'error' | 'ready';

interface ListSectionColumn<T> {
  key: string;
  header: string;
  align?: 'start' | 'end' | undefined;
  cell: (item: T) => ReactNode;
}

type ListSectionRenderMode<T> =
  | { renderItem: (item: T) => ReactNode; columns?: never }
  | { columns: ListSectionColumn<T>[]; renderItem?: never };

type ListSectionProps<T> = ListSectionRenderMode<T> & {
  status: ListSectionStatus;
  items: readonly T[];
  getKey: (item: T) => string;
  skeletonRowCount?: number | undefined;
  'aria-label'?: string | undefined;
  className?: string | undefined;
};

export type { ListSectionColumn, ListSectionProps, ListSectionRenderMode, ListSectionStatus };
