import { servicesApi } from '@/shared/api/servicesApi';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Paging } from '@/shared/pagination/paging';
import type { Client, ClientInput } from '../model/client';
import type { ClientList } from '../model/clientList';

export interface ClientListQuery extends Paging {
  search: string;
}

function list(
  { search, page, pageSize }: ClientListQuery,
  signal?: AbortSignal,
): Promise<ApiResult<ClientList>> {
  return servicesApi.get('/api/v{version}/clients', {
    query: { Page: page, PageSize: pageSize, ...(search ? { Search: search } : {}) },
    signal,
  });
}

function create(input: ClientInput): Promise<ApiResult<Client>> {
  return servicesApi.post('/api/v{version}/clients', { body: input });
}

export const clientsRepository = { list, create };
