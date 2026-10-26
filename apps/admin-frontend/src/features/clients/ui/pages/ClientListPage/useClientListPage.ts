import type { SubmitEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useSearchParamsState } from '@/shared/hooks/useSearchParamsState';
import { useTopic } from '@/shared/pubsub/useTopic';
import { usePaginatedList } from '@/widgets/paginated-list-section';
import { clientsRepository } from '../../../api/clientsRepository';
import { clientDeleted } from '../../../model/clientEvents';
import {
  INITIAL_CLIENT_LIST_FILTERS,
  INITIAL_CLIENT_LIST_QUERY,
  type ClientListFilters,
} from '../../../model/clientListFilters';
import type { UseClientListPageResult } from './useClientListPage.types';

export function useClientListPage(): UseClientListPageResult {
  const state = useSearchParamsState(INITIAL_CLIENT_LIST_QUERY);
  const { filters, applyFilters, refetch, list, pagination } = usePaginatedList({
    state,
    fetchPage: clientsRepository.list,
  });
  const filterForm = useForm<ClientListFilters>({ defaultValues: filters });
  const chosenStatus = useWatch({ control: filterForm.control, name: 'status' });

  useTopic(clientDeleted, refetch);

  function onFiltersSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters(filterForm.getValues());
  }

  function onClearFilters() {
    filterForm.reset(INITIAL_CLIENT_LIST_FILTERS);
    applyFilters(INITIAL_CLIENT_LIST_FILTERS);
  }

  return {
    list,
    pagination,
    searchTerm: filters.search,
    filterForm,
    hasPendingFilters: chosenStatus !== filters.status,
    canClearFilters:
      filters.search !== INITIAL_CLIENT_LIST_FILTERS.search ||
      filters.status !== INITIAL_CLIENT_LIST_FILTERS.status,
    onFiltersSubmit,
    onClearFilters,
  };
}
