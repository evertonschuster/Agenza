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
  skeleton?: ReactNode;
  cell: (item: T) => ReactNode;
}

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

interface ListSectionFailure {
  message: string;
  code?: string | undefined;
  onRetry?: (() => void) | undefined;
}

interface ListSectionProps<T> {
  columns: ListSectionColumn<T>[];
  status: ListSectionStatus;
  items: readonly T[];
  getKey: (item: T) => string;
  skeletonRowCount?: number | undefined;
  emptyCopy?: ListSectionEmptyCopy | undefined;
  search?: ListSectionSearch | undefined;
  errorTitle?: string | undefined;
  failure?: ListSectionFailure | null | undefined;
  'aria-label': string;
  className?: string | undefined;
}

interface ListSectionSkeletonProps<T> {
  rowCount: number;
  columns: ListSectionColumn<T>[];
  ariaLabel: string;
}

interface ListSectionTableProps<T> {
  items: readonly T[];
  columns: ListSectionColumn<T>[];
  getKey: (item: T) => string;
  ariaLabel: string;
}

interface ListSectionReadyProps<T> extends ListSectionTableProps<T> {
  emptyCopy?: ListSectionEmptyCopy | undefined;
  search?: ListSectionSearch | undefined;
}

interface ListSectionEmptyProps {
  copy?: ListSectionEmptyCopy | undefined;
  search?: ListSectionSearch | undefined;
}

interface ListSectionErrorProps {
  title?: string | undefined;
  failure?: ListSectionFailure | null | undefined;
}

export type {
  ListSectionColumn,
  ListSectionEmptyCopy,
  ListSectionEmptyProps,
  ListSectionErrorProps,
  ListSectionFailure,
  ListSectionSearch,
  ListSectionProps,
  ListSectionSkeletonProps,
  ListSectionReadyProps,
  ListSectionTableProps,
};
