import { useState } from 'react'
import { useDebouncedValue } from '@/shared/presentation/hooks/useDebouncedValue'

export interface UseServiceFiltersResult {
  searchInput: string
  onSearchInputChange: (value: string) => void
  categoryFilter: string
  onCategoryFilterChange: (value: string) => void
  tagFilter: string
  onTagFilterChange: (value: string) => void
  debouncedSearch: string
  hasActiveFilters: boolean
}

export function useServiceFilters(): UseServiceFiltersResult {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  return {
    searchInput,
    onSearchInputChange: setSearchInput,
    categoryFilter,
    onCategoryFilterChange: setCategoryFilter,
    tagFilter,
    onTagFilterChange: setTagFilter,
    debouncedSearch,
    hasActiveFilters: debouncedSearch.trim() !== '' || categoryFilter !== '' || tagFilter !== '',
  }
}
