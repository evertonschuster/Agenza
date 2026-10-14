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
  disabled?: boolean | undefined;
}

export type PaginationSummaryProps = Pick<
  PaginationProps,
  'page' | 'pageSize' | 'totalCount' | 'itemLabel'
>;

export type PaginationPageSizeProps = Pick<
  PaginationProps,
  'pageSize' | 'onPageSizeChange' | 'disabled'
>;

export interface PaginationPagesProps extends Pick<
  PaginationProps,
  'page' | 'onPageChange' | 'disabled'
> {
  lastPage: number;
}
