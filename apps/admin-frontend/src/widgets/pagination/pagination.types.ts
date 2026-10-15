export interface PaginationItemLabel {
  singular: string;
  plural: string;
}

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  itemLabel: PaginationItemLabel;
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
