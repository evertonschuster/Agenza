import { servicesApi } from '@/shared/api/servicesApi';
import type { ApiResult } from '@/shared/api/servicesFacade';
import { ok } from '@/shared/result';
import type { Client, ClientInput } from '../model/client';
import type { ClientList } from '../model/clientList';

async function list(search?: string, signal?: AbortSignal): Promise<ApiResult<ClientList>> {
  const result = await servicesApi.get('/api/v{version}/clients', {
    query: search ? { Search: search } : undefined,
    signal,
  });

  if (!result.ok) return result;

  return ok({ items: result.data.items, totalCount: Number(result.data.totalCount) });
}

function create(input: ClientInput): Promise<ApiResult<Client>> {
  return servicesApi.post('/api/v{version}/clients', { body: input });
}

export const clientsRepository = { list, create };
