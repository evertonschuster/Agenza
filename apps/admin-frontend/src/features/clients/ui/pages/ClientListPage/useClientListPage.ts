import { useRef, useState, type SubmitEvent } from 'react';
import { usePaginatedList } from '@/widgets/paginated-list-section';
import { clientsRepository } from '../../../api/clientsRepository';
import {
  INITIAL_CLIENT_LIST_FILTERS,
  type ClientStatusFilter,
} from '../../../model/clientListFilters';
import type { UseClientListPageResult } from './useClientListPage.types';

export function useClientListPage(): UseClientListPageResult {
  const { filters, applyFilters, list, pagination } = usePaginatedList({
    initialFilters: INITIAL_CLIENT_LIST_FILTERS,
    fetchPage: clientsRepository.list,
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [statusChoice, setStatusChoice] = useState<ClientStatusFilter>(
    INITIAL_CLIENT_LIST_FILTERS.status,
  );

  function onFiltersSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters({ search: searchInputRef.current?.value ?? '', status: statusChoice });
  }

  function onClearSearch() {
    if (searchInputRef.current) searchInputRef.current.value = '';
    applyFilters({ search: '' });
  }

  function onClearFilters() {
    if (searchInputRef.current) searchInputRef.current.value = '';
    setStatusChoice(INITIAL_CLIENT_LIST_FILTERS.status);
    applyFilters(INITIAL_CLIENT_LIST_FILTERS);
  }

  return {
    list,
    pagination,
    searchTerm: filters.search,
    searchInputRef,
    statusChoice,
    hasPendingFilters: statusChoice !== filters.status,
    canClearFilters:
      filters.search !== INITIAL_CLIENT_LIST_FILTERS.search ||
      filters.status !== INITIAL_CLIENT_LIST_FILTERS.status,
    onStatusChoiceChange: setStatusChoice,
    onFiltersSubmit,
    onClearSearch,
    onClearFilters,
  };
}
