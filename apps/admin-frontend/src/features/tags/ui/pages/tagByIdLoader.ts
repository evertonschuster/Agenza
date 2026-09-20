import { redirect, type LoaderFunctionArgs } from 'react-router';
import { tagsRepository } from '../../api/tagsRepository';
import { classifyTagResult, type TagLoadResult } from '../../model/tag';

// Shared by TagFormPage (edit mode) and TagRemovePage's route entries — both need the exact same
// "fetch this one tag by :id" behavior, and it belongs to neither page more than the other, so it
// lives here instead of being duplicated across two route.ts files or borrowed from one by the other.
export async function tagByIdLoader({ params }: LoaderFunctionArgs): Promise<TagLoadResult> {
  if (!params.id) {
    return { status: 'not-found' };
  }

  const result = await tagsRepository.get(params.id);
  if (
    !result.ok &&
    (result.error.code === 'Session.Missing' || result.error.code === 'Authorization.Unauthorized')
  ) {
    // React Router's own convention: throwing a redirect Response from a loader performs the
    // navigation directly, bypassing the route's errorElement — not an actual error.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect('/login');
  }

  return classifyTagResult(result);
}
