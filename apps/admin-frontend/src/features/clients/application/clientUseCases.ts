import type { ApiResult } from '@/shared/api/servicesFacade';
import { clientsRepository } from '../api/clientsRepository';
import type { Client, ClientInput } from '../model/client';
import { clientCreated, clientDeleted, clientUpdated } from '../model/clientEvents';

export async function createClient(input: ClientInput): Promise<ApiResult<Client>> {
  const result = await clientsRepository.create(input);
  if (result.ok) clientCreated.publish({ id: result.data.id });
  return result;
}

export async function updateClient(id: string, input: ClientInput): Promise<ApiResult<Client>> {
  const result = await clientsRepository.update(id, input);
  if (result.ok) clientUpdated.publish({ id: result.data.id });
  return result;
}

export async function deleteClient(id: string): Promise<ApiResult<void>> {
  const result = await clientsRepository.delete(id);
  if (result.ok) clientDeleted.publish({ id });
  return result;
}
