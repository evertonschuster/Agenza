import type { ApiResult } from '@/shared/api/servicesFacade';
import { tagsRepository } from '../api/tagsRepository';
import type { Tag, TagInput } from '../model/tag';
import { tagDeleted, tagSaved } from '../model/tagEvents';

export async function createTag(input: TagInput): Promise<ApiResult<Tag>> {
  const result = await tagsRepository.create(input);
  if (result.ok) tagSaved.publish({ id: result.data.id });
  return result;
}

export async function updateTag(id: string, input: TagInput): Promise<ApiResult<Tag>> {
  const result = await tagsRepository.update(id, input);
  if (result.ok) tagSaved.publish({ id: result.data.id });
  return result;
}

export async function deleteTag(id: string): Promise<ApiResult<void>> {
  const result = await tagsRepository.delete(id);
  if (result.ok) tagDeleted.publish({ id });
  return result;
}
