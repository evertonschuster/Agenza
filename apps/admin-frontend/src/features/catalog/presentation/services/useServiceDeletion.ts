import { useState } from 'react'
import type { Service } from '@/features/catalog/domain/entities/Service'
import { messageFrom } from '@/features/catalog/presentation/services/serviceFormatters'

interface UseServiceDeletionParams {
  onDelete: (id: string) => Promise<void>
}

export interface UseServiceDeletionResult {
  target: Service | null
  error: string | null
  isDeleting: boolean
  onRequestDelete: (service: Service) => void
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function useServiceDeletion({
  onDelete,
}: UseServiceDeletionParams): UseServiceDeletionResult {
  const [target, setTarget] = useState<Service | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function onRequestDelete(service: Service): void {
    setTarget(service)
    setError(null)
  }

  function onCancel(): void {
    setTarget(null)
    setError(null)
  }

  async function onConfirm(): Promise<void> {
    if (target === null) {
      return
    }
    setIsDeleting(true)
    setError(null)
    try {
      await onDelete(target.id)
      setTarget(null)
    } catch (caughtError) {
      setError(messageFrom(caughtError, 'Não foi possível excluir o serviço.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return { target, error, isDeleting, onRequestDelete, onCancel, onConfirm }
}
