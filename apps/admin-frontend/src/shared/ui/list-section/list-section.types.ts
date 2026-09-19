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

interface ListSectionSkeletonProps {
  rowCount: number;
}

interface ListSectionTableProps<T> {
  items: readonly T[];
  columns: ListSectionColumn<T>[];
  getKey: (item: T) => string;
  ariaLabel?: string | undefined;
}

interface ListSectionListProps<T> {
  items: readonly T[];
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
  ariaLabel?: string | undefined;
}

export type {
  ListSectionColumn,
  ListSectionProps,
  ListSectionRenderMode,
  ListSectionStatus,
  ListSectionSkeletonProps,
  ListSectionTableProps,
  ListSectionListProps,
};
