import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { unwrapOrThrow } from '@/shared/api/unwrap';
import type { ApiResult } from '@/shared/api/servicesFacade';
import { tagsRepository, type TagInput } from '../../../api/tagsRepository';
import type { Tag } from '../../../model/tag';

export interface TagsLoaderData {
  tags: Tag[];
  query: string;
}

export async function tagsLoader({ request }: LoaderFunctionArgs): Promise<TagsLoaderData> {
  const query = new URL(request.url).searchParams.get('q') ?? '';
  const result = await tagsRepository.list(query || undefined);
  return { tags: unwrapOrThrow(result), query };
}

function stringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function readTagInput(formData: FormData): TagInput {
  const description = stringField(formData, 'description').trim();
  return {
    name: stringField(formData, 'name'),
    color: stringField(formData, 'color'),
    description: description || null,
  };
}

export async function tagsAction({
  request,
}: ActionFunctionArgs): Promise<ApiResult<Tag> | ApiResult<void>> {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'create') {
    return tagsRepository.create(readTagInput(formData));
  }

  if (intent === 'update') {
    return tagsRepository.update(stringField(formData, 'id'), readTagInput(formData));
  }

  if (intent === 'delete') {
    return tagsRepository.remove(stringField(formData, 'id'));
  }

  // React Router's own convention: throwing a Response from an action routes to the
  // nearest error boundary instead of resolving the fetcher — not reachable from this
  // feature's own dialogs, only from a malformed submission.
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw new Response('Unknown intent', { status: 400 });
}
