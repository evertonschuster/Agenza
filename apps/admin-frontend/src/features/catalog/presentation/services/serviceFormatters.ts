import type { Service } from '@/features/catalog/domain/entities/Service'
import type {
  CreateServiceInput,
  UpdateServiceInput,
} from '@/features/catalog/application/repositories/ServiceRepository'
import type {
  ServiceFormInput,
  ServiceFormValues,
} from '@/features/catalog/presentation/services/ServiceForm.schema'
import type { SelectLoadState } from '@/shared/presentation/components/SelectLoadState'
import type { AsyncState } from '@/shared/presentation/hooks/useAsync'
import type { UiError } from '@/shared/application/UiError'

// Kept out of the page/components themselves: plain runtime helpers
// exported alongside a component would break Vite Fast Refresh for that
// file (react-refresh/only-export-components).

export const EMPTY_SERVICE_FORM_VALUES: ServiceFormInput = {
  name: '',
  description: '',
  durationMinutes: '',
  minDurationMinutes: '',
  maxDurationMinutes: '',
  price: '',
  maxDiscountPercentage: '',
  categoryId: null,
  tagIds: [],
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatPrice(price: number): string {
  return currencyFormatter.format(price)
}

export function formatDuration(service: Service): string {
  const duration = String(service.durationMinutes)
  const min = String(service.minDurationMinutes)
  const max = String(service.maxDurationMinutes)
  return `${duration} min (${min}–${max})`
}

export function toServiceInput(values: ServiceFormValues): CreateServiceInput | UpdateServiceInput {
  const description = values.description.trim()
  return {
    name: values.name.trim(),
    description: description !== '' ? description : null,
    durationMinutes: values.durationMinutes,
    minDurationMinutes: values.minDurationMinutes,
    maxDurationMinutes: values.maxDurationMinutes,
    price: values.price,
    maxDiscountPercentage: values.maxDiscountPercentage,
    categoryId: values.categoryId,
    tagIds: values.tagIds,
  }
}

export function toServiceFormValues(service: Service): ServiceFormInput {
  return {
    name: service.name,
    description: service.description ?? '',
    durationMinutes: String(service.durationMinutes),
    minDurationMinutes: String(service.minDurationMinutes),
    maxDurationMinutes: String(service.maxDurationMinutes),
    price: String(service.price),
    maxDiscountPercentage: String(service.maxDiscountPercentage),
    categoryId: service.categoryId ?? null,
    tagIds: service.tags.map(tag => tag.id),
  }
}

export function toSelectLoadState<T>(
  state: AsyncState<T, UiError>,
  onRetry: () => void,
): SelectLoadState {
  switch (state.status) {
    case 'success':
      return { status: 'success' }
    case 'initialError':
    case 'refreshError':
      return {
        status: 'error',
        message: state.error.message,
        ...(state.error.retryable ? { onRetry } : {}),
      }
    default:
      return { status: 'loading' }
  }
}

export function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
