import { useCallback, useState } from 'react'
import { useAppContainer } from '@/app/providers/useAppContainer'
import type { Category } from '@/features/catalog/domain/entities/Category'
import type { AppError } from '@/shared/application/AppError'
import type { UseCategoriesListPageResult } from './useCategoriesListPage.types'

export function useCategoriesListPage(): UseCategoriesListPageResult {
  const { catalog } = useAppContainer()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AppError | null>(null)


  const load = useCallback(async (search: string): Promise<void> => {
    setLoading(true)
    setError(null)
    const result = await catalog.listCategories.execute({ search })
    if (result.success) {
      setCategories(result.value)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }, [catalog])


  return { categories, loading, error, load }
}
