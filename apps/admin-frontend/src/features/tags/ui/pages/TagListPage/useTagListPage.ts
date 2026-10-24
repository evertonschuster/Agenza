import type { SubmitEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router';
import { useSearchParamsState } from '@/shared/hooks/useSearchParamsState';
import { useTopic } from '@/shared/pubsub/useTopic';
import { usePaginatedList } from '@/widgets/paginated-list-section';
import { tagsRepository } from '../../../api/tagsRepository';
import { tagDeleted, tagSaved } from '../../../model/tagEvents';
import {
  INITIAL_TAG_LIST_FILTERS,
  INITIAL_TAG_LIST_QUERY,
  type TagListFilters,
} from '../../../model/tagListFilters';
import type { UseTagListPageResult } from './useTagListPage.types';

export function useTagListPage(): UseTagListPageResult {
  const { search: queryString } = useLocation();
  const state = useSearchParamsState(INITIAL_TAG_LIST_QUERY);
  const { filters, applyFilters, refetch, list, pagination } = usePaginatedList({
    state,
    fetchPage: tagsRepository.list,
  });
  const filterForm = useForm<TagListFilters>({ defaultValues: filters });

  useTopic(tagDeleted, refetch);
  useTopic(tagSaved, refetch);

  function onFiltersSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters(filterForm.getValues());
  }

  function onClearFilters() {
    filterForm.reset(INITIAL_TAG_LIST_FILTERS);
    applyFilters(INITIAL_TAG_LIST_FILTERS);
  }

  return {
    list,
    pagination,
    searchTerm: filters.search,
    queryString,
    filterForm,
    canClearFilters: filters.search !== INITIAL_TAG_LIST_FILTERS.search,
    onFiltersSubmit,
    onClearFilters,
  };
}
