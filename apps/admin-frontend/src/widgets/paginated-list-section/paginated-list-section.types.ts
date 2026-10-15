import type { ListSectionProps } from '@/widgets/list-section';
import type { PaginationProps } from '@/widgets/pagination';

type PaginatedListSectionPaging = Omit<PaginationProps, 'totalCount' | 'disabled'> & {
  totalCount: number | null;
};

type PaginatedListSectionProps<T> = ListSectionProps<T> & {
  pagination: PaginatedListSectionPaging;
  skeletonRowCount?: never;
};

export type { PaginatedListSectionPaging, PaginatedListSectionProps };
