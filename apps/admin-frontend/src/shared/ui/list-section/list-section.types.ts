import type { ReactNode } from 'react';

type ListSectionStatus = 'loading' | 'error' | 'ready';

interface ListSectionColumn<T> {
  key: string;
  header: string;
  align?: 'end' | undefined;
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

interface ListSectionItemsProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  ariaLabel?: string | undefined;
}

interface ListSectionReadyProps<T> extends ListSectionItemsProps<T> {
  renderMode: ListSectionRenderMode<T>;
}

interface ListSectionTableProps<T> extends ListSectionItemsProps<T> {
  columns: ListSectionColumn<T>[];
}

interface ListSectionListProps<T> extends ListSectionItemsProps<T> {
  renderItem: (item: T) => ReactNode;
}

export type {
  ListSectionColumn,
  ListSectionProps,
  ListSectionRenderMode,
  ListSectionStatus,
  ListSectionSkeletonProps,
  ListSectionItemsProps,
  ListSectionReadyProps,
  ListSectionTableProps,
  ListSectionListProps,
};
