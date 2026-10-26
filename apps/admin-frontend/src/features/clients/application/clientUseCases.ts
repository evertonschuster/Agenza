import type { ApiResult } from '@/shared/api/servicesFacade';
import { clientsRepository } from '../api/clientsRepository';
import { clientDeleted } from '../model/clientEvents';

export async function deleteClient(id: string): Promise<ApiResult<void>> {
  const result = await clientsRepository.delete(id);
  if (result.ok) clientDeleted.publish({ id });
  return result;
}
