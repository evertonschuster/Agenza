import { useLoaderData, useLocation, useNavigation } from 'react-router';
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
  const location = useLocation();
  const navigation = useNavigation();

  // A search resubmission re-runs this same route's loader without unmounting the page — the
  // router keeps the previous loader data current until the new one lands, so without this check
  // the table would keep showing stale rows with no indication a new fetch is in flight.
  const isReloading =
    navigation.state === 'loading' && navigation.location.pathname === location.pathname;

  return {
    status: isReloading ? 'loading' : data.status,
    tags: data.status === 'ready' ? data.tags : [],
    query: data.query,
  };
}
