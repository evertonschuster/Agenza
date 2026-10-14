import { servicesApi } from '@/shared/api/servicesApi';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Client, ClientInput } from '../model/client';
import type { ClientList } from '../model/clientList';

function list(search?: string, signal?: AbortSignal): Promise<ApiResult<ClientList>> {
  return servicesApi.get('/api/v{version}/clients', {
    query: search ? { Search: search } : undefined,
    signal,
  });
}

function create(input: ClientInput): Promise<ApiResult<Client>> {
  return servicesApi.post('/api/v{version}/clients', { body: input });
}

export const clientsRepository = { list, create };
