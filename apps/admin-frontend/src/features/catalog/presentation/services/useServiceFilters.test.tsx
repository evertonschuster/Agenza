import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useServiceFilters } from '@/features/catalog/presentation/services/useServiceFilters'

describe('useServiceFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with every filter empty and no active filters', () => {
    const { result } = renderHook(() => useServiceFilters())

    expect(result.current.searchInput).toBe('')
    expect(result.current.debouncedSearch).toBe('')
    expect(result.current.categoryFilter).toBe('')
    expect(result.current.tagFilter).toBe('')
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('only reflects the debounced search once the delay elapses', () => {
    const { result } = renderHook(() => useServiceFilters())

    act(() => {
      result.current.onSearchInputChange('massa')
    })
    expect(result.current.searchInput).toBe('massa')
    expect(result.current.debouncedSearch).toBe('')

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.debouncedSearch).toBe('massa')
  })

  it('does not count a blank debounced search as an active filter', () => {
    const { result } = renderHook(() => useServiceFilters())

    act(() => {
      result.current.onSearchInputChange('   ')
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('marks hasActiveFilters once the debounced search is non-blank', () => {
    const { result } = renderHook(() => useServiceFilters())

    act(() => {
      result.current.onSearchInputChange('corte')
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('marks hasActiveFilters when a category filter is set, independent of search', () => {
    const { result } = renderHook(() => useServiceFilters())

    act(() => {
      result.current.onCategoryFilterChange('category-1')
    })

    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('marks hasActiveFilters when a tag filter is set, independent of search', () => {
    const { result } = renderHook(() => useServiceFilters())

    act(() => {
      result.current.onTagFilterChange('tag-1')
    })

    expect(result.current.hasActiveFilters).toBe(true)
  })
})
