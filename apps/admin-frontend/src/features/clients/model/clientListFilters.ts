import { DEFAULT_PAGE_SIZE, FIRST_PAGE, type Paging } from '@/shared/pagination/paging';
import type { ClientStatus } from './clientStatus';

export type ClientStatusFilter = ClientStatus | 'all';

export const CLIENT_STATUS_FILTER_OPTIONS: readonly { value: ClientStatusFilter; label: string }[] =
  [
    { value: 'active', label: 'Ativas' },
    { value: 'inactive', label: 'Inativas' },
    { value: 'all', label: 'Todas' },
  ];

export interface ClientListFilters {
  search: string;
  status: ClientStatusFilter;
}

export type ClientListQuery = ClientListFilters & Paging;

export const INITIAL_CLIENT_LIST_FILTERS: ClientListFilters = { search: '', status: 'active' };

export const INITIAL_CLIENT_LIST_QUERY: ClientListQuery = {
  ...INITIAL_CLIENT_LIST_FILTERS,
  page: FIRST_PAGE,
  pageSize: DEFAULT_PAGE_SIZE,
};
