import type { ReactNode } from 'react';

export const ListSectionStatus = {
  Loading: 'loading',
  Error: 'error',
  Ready: 'ready',
} as const;

export type ListSectionStatus = (typeof ListSectionStatus)[keyof typeof ListSectionStatus];

interface ListSectionColumn<T> {
  key: string;
  header: string;
  align?: 'end' | undefined;
  cell: (item: T) => ReactNode;
}

type ListSectionRenderMode<T> =
  | { renderItem: (item: T) => ReactNode; columns?: never }
  | { columns: ListSectionColumn<T>[]; renderItem?: never };

interface ListSectionEmptyCopy {
  title?: string | undefined;
  description?: string | undefined;
  searchTitle?: ((term: string) => string) | undefined;
  searchDescription?: string | undefined;
}

interface ListSectionSearch {
  term: string;
  onClear: () => void;
}

type ListSectionProps<T> = ListSectionRenderMode<T> & {
  status: ListSectionStatus;
  items: readonly T[];
  getKey: (item: T) => string;
  skeletonRowCount?: number | undefined;
  emptyCopy?: ListSectionEmptyCopy | undefined;
  search?: ListSectionSearch | undefined;
  error?: ReactNode | undefined;
  'aria-label': string;
  className?: string | undefined;
};

interface ListSectionSkeletonProps {
  rowCount: number;
}

interface ListSectionItemsProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  ariaLabel: string;
}

interface ListSectionReadyProps<T> extends ListSectionItemsProps<T> {
  renderMode: ListSectionRenderMode<T>;
  emptyCopy?: ListSectionEmptyCopy | undefined;
  search?: ListSectionSearch | undefined;
}

interface ListSectionEmptyProps {
  copy?: ListSectionEmptyCopy | undefined;
  search?: ListSectionSearch | undefined;
}

interface ListSectionTableProps<T> extends ListSectionItemsProps<T> {
  columns: ListSectionColumn<T>[];
}

interface ListSectionListProps<T> extends ListSectionItemsProps<T> {
  renderItem: (item: T) => ReactNode;
}

export type {
  ListSectionColumn,
  ListSectionEmptyCopy,
  ListSectionEmptyProps,
  ListSectionSearch,
  ListSectionProps,
  ListSectionRenderMode,
  ListSectionSkeletonProps,
  ListSectionItemsProps,
  ListSectionReadyProps,
  ListSectionTableProps,
  ListSectionListProps,
};
