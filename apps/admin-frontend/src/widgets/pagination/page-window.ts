import { FIRST_PAGE } from '@/shared/pagination/paging';

const SIBLINGS = 1;
const WINDOW_SLOTS = 2 * SIBLINGS + 5;
const EDGE_RUN = WINDOW_SLOTS - 2;

type PageWindowItem = number | 'ellipsis';

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function getPageWindow(page: number, lastPage: number): PageWindowItem[] {
  if (lastPage <= WINDOW_SLOTS) return range(FIRST_PAGE, lastPage);

  if (page < EDGE_RUN) return [...range(FIRST_PAGE, EDGE_RUN), 'ellipsis', lastPage];

  if (page > lastPage - EDGE_RUN + 1) {
    return [FIRST_PAGE, 'ellipsis', ...range(lastPage - EDGE_RUN + 1, lastPage)];
  }

  return [FIRST_PAGE, 'ellipsis', ...range(page - SIBLINGS, page + SIBLINGS), 'ellipsis', lastPage];
}
