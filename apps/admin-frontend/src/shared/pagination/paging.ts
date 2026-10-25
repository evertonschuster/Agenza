export const FIRST_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface Paging {
  page: number;
  pageSize: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export function getLastPage(totalCount: number, pageSize: number): number {
  return Math.max(FIRST_PAGE, Math.ceil(totalCount / pageSize));
}
