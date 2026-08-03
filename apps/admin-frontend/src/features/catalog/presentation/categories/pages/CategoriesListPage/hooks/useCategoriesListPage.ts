import { useCallback, useEffect, useState } from 'react'
import { useAppContainer } from '@/app/providers/useAppContainer'
import { toUiError, type UiError } from '@/shared/application/UiError'
import type { Category } from '@/features/catalog/domain/entities/Category'

export function useCategoriesListPage(search: string) {
  const { catalog } = useAppContainer()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<UiError | null>(null)


  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    const result = await catalog.listCategories.execute({ search })
    if (result.success) {
      setCategories(result.value)
      setError(null)
    } else {
      setError(toUiError(result.error))
    }
    setLoading(false)
  }, [catalog, search])

  useEffect(() => {
    void load().then(() => {
      // no-op
    })
  }, [load])

  return { categories, loading, error, onRetry: load }
}
