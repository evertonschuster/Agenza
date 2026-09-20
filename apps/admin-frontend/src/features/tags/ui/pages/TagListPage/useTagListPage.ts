import { useLoaderData } from 'react-router';
import type { ListSectionStatus } from '@/shared/ui/list-section';
import type { Tag } from '../../../model/tag';
import type { TagListLoaderData } from './route';

interface UseTagListPageResult {
  status: ListSectionStatus;
  tags: Tag[];
  query: string;
}

export function useTagListPage(): UseTagListPageResult {
  const data = useLoaderData<TagListLoaderData>();

  return {
    status: data.status,
    tags: data.status === 'ready' ? data.tags : [],
    query: data.query,
  };
}
