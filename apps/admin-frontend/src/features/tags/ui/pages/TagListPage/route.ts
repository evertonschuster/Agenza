import { redirect, type LoaderFunctionArgs } from 'react-router';
import { tagsRepository } from '../../../api/tagsRepository';
import type { Tag } from '../../../model/tag';

export type TagListLoaderData =
  { status: 'ready'; tags: Tag[]; query: string } | { status: 'error'; query: string };

export async function loader({ request }: LoaderFunctionArgs): Promise<TagListLoaderData> {
  const query = new URL(request.url).searchParams.get('q') ?? '';
  const result = await tagsRepository.list(query || undefined);

  if (result.ok) {
    return { status: 'ready', tags: result.data, query };
  }

  if (
    result.error.code === 'Session.Missing' ||
    result.error.code === 'Authorization.Unauthorized'
  ) {
    // React Router's own convention: throwing a redirect Response from a loader performs the
    // navigation directly, bypassing the route's errorElement — not an actual error.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect('/login');
  }

  return { status: 'error', query };
}
