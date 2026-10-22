import type { ClientStatus } from './clientStatus';

export type ClientStatusFilter = ClientStatus | 'all';

export const CLIENT_STATUS_FILTERS: readonly ClientStatusFilter[] = ['active', 'inactive', 'all'];

export const CLIENT_STATUS_FILTER_LABELS: Record<ClientStatusFilter, string> = {
  active: 'Ativas',
  inactive: 'Inativas',
  all: 'Todas',
};

export interface ClientListFilters {
  search: string;
  status: ClientStatusFilter;
}

export const INITIAL_CLIENT_LIST_FILTERS: ClientListFilters = { search: '', status: 'active' };
