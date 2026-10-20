export const FIRST_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const WINDOW_SLOTS = 7;
const EDGE_RUN = 5;

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

export type PageWindowItem = number | 'ellipsis';

export interface VisibleRange {
  first: number;
  last: number;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function getLastPage(totalCount: number, pageSize: number): number {
  return Math.max(FIRST_PAGE, Math.ceil(totalCount / pageSize));
}

export function getVisibleRange({ page, pageSize }: Paging, totalCount: number): VisibleRange {
  return { first: (page - 1) * pageSize + 1, last: Math.min(page * pageSize, totalCount) };
}

export function getPageWindow(page: number, lastPage: number): PageWindowItem[] {
  if (lastPage <= WINDOW_SLOTS) return range(FIRST_PAGE, lastPage);

  if (page < EDGE_RUN) return [...range(FIRST_PAGE, EDGE_RUN), 'ellipsis', lastPage];

  if (page > lastPage - EDGE_RUN + 1) {
    return [FIRST_PAGE, 'ellipsis', ...range(lastPage - EDGE_RUN + 1, lastPage)];
  }

  return [FIRST_PAGE, 'ellipsis', page - 1, page, page + 1, 'ellipsis', lastPage];
}
