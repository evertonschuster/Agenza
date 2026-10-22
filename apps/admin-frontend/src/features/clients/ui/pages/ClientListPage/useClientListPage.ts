import type { SubmitEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { usePaginatedList } from '@/widgets/paginated-list-section';
import { clientsRepository } from '../../../api/clientsRepository';
import {
  INITIAL_CLIENT_LIST_FILTERS,
  type ClientListFilters,
} from '../../../model/clientListFilters';
import type { UseClientListPageResult } from './useClientListPage.types';

export function useClientListPage(): UseClientListPageResult {
  const { filters, applyFilters, list, pagination } = usePaginatedList({
    initialFilters: INITIAL_CLIENT_LIST_FILTERS,
    fetchPage: clientsRepository.list,
  });
  const filterForm = useForm<ClientListFilters>({ defaultValues: INITIAL_CLIENT_LIST_FILTERS });
  const chosenStatus = useWatch({ control: filterForm.control, name: 'status' });

  function onFiltersSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters(filterForm.getValues());
  }

  function onClearSearch() {
    filterForm.setValue('search', '');
    applyFilters({ search: '' });
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
    onClearSearch,
    onClearFilters,
  };
}
