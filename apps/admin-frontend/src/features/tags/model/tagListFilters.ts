import { DEFAULT_PAGE_SIZE, FIRST_PAGE, type Paging } from '@/shared/pagination/paging';

export interface TagListFilters {
  search: string;
}

export type TagListQuery = TagListFilters & Paging;

export const INITIAL_TAG_LIST_FILTERS: TagListFilters = { search: '' };

export const INITIAL_TAG_LIST_QUERY: TagListQuery = {
  ...INITIAL_TAG_LIST_FILTERS,
  page: FIRST_PAGE,
  pageSize: DEFAULT_PAGE_SIZE,
};
