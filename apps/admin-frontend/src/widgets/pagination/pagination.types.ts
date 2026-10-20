import type { ComponentProps, ReactNode } from 'react';
import type { CountNoun } from '@/shared/format/count';

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  itemLabel: CountNoun;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export type PaginationSummaryProps = Pick<
  PaginationProps,
  'page' | 'pageSize' | 'totalCount' | 'itemLabel'
>;

export type PaginationPageSizeProps = Pick<PaginationProps, 'pageSize' | 'onPageSizeChange'>;

export interface PaginationPagesProps extends Pick<PaginationProps, 'page' | 'onPageChange'> {
  lastPage: number;
}

export interface PaginationLayoutProps extends Pick<ComponentProps<'div'>, 'aria-hidden'> {
  summary: ReactNode;
  pages: ReactNode;
  pageSize: ReactNode;
}
