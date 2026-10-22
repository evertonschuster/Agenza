import { servicesApi } from '@/shared/api/servicesApi';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Client, ClientInput } from '../model/client';
import type { ClientList } from '../model/clientList';
import type { ClientListQuery } from '../model/clientListFilters';

function list(
  { search, status, page, pageSize }: ClientListQuery,
  signal?: AbortSignal,
): Promise<ApiResult<ClientList>> {
  return servicesApi.get('/api/v{version}/clients', {
    query: {
      Page: page,
      PageSize: pageSize,
      Status: status,
      ...(search ? { Search: search } : {}),
    },
    signal,
  });
}

function create(input: ClientInput): Promise<ApiResult<Client>> {
  return servicesApi.post('/api/v{version}/clients', { body: input });
}

export const clientsRepository = { list, create };
