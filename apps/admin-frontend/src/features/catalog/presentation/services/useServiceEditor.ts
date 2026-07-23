import { useRef, useState, type MouseEvent, type RefObject } from 'react'
import type { Service } from '@/features/catalog/domain/entities/Service'
import type {
  CreateServiceInput,
  UpdateServiceInput,
} from '@/features/catalog/application/repositories/ServiceRepository'
import {
  mapApiErrorToForm,
  type ServerFormError,
} from '@/shared/presentation/forms/serverFormError'
import {
  serviceFieldMap,
  serviceCodeFieldMap,
} from '@/features/catalog/presentation/forms/fieldMaps'
import type {
  ServiceFormField,
  ServiceFormValues,
} from '@/features/catalog/presentation/services/ServiceForm.schema'
import { toServiceInput } from '@/features/catalog/presentation/services/serviceFormatters'
import type {
  DiscardConfirmationViewModel,
  ServiceEditorViewModel,
  ServiceFormTarget,
} from '@/features/catalog/presentation/services/servicePresentationModels'

interface UseServiceEditorParams {
  onCreate: (input: CreateServiceInput) => Promise<Service>
  onUpdate: (id: string, input: UpdateServiceInput) => Promise<Service>
}

export interface UseServiceEditorResult {
  onOpenCreate: (event: MouseEvent<HTMLButtonElement>) => void
  onOpenEdit: (service: Service, event: MouseEvent<HTMLButtonElement>) => void
  editor: ServiceEditorViewModel
  discardConfirmation: DiscardConfirmationViewModel
}

/** Target, dirty/submit state, and discard-confirmation for the create/edit dialog. */
export function useServiceEditor({
  onCreate,
  onUpdate,
}: UseServiceEditorParams): UseServiceEditorResult {
  const [formTarget, setFormTarget] = useState<ServiceFormTarget | null>(null)
  const [displayTarget, setDisplayTarget] = useState<ServiceFormTarget | null>(null)
  const [serverError, setServerError] = useState<ServerFormError<ServiceFormField> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  // Restores focus to whichever button opened the dialog once it closes,
  // instead of relying on Radix's previously-focused-element fallback
  // (unreliable when open is driven externally, not via DialogTrigger).
  const formTriggerRef: RefObject<HTMLButtonElement | null> = useRef(null)

  function onOpenCreate(event: MouseEvent<HTMLButtonElement>): void {
    formTriggerRef.current = event.currentTarget
    setFormTarget('new')
    setDisplayTarget('new')
    setServerError(null)
    setIsFormDirty(false)
  }

  function onOpenEdit(service: Service, event: MouseEvent<HTMLButtonElement>): void {
    formTriggerRef.current = event.currentTarget
    setFormTarget(service)
    setDisplayTarget(service)
    setServerError(null)
    setIsFormDirty(false)
  }

  function closeForm(): void {
    // displayTarget stays as-is: Dialog fades out over ~100ms after `open`
    // flips to false, and clearing it here would blank the form mid-animation.
    setFormTarget(null)
    setServerError(null)
    setIsFormDirty(false)
    setShowDiscardConfirm(false)
  }

  function requestCloseForm(): void {
    if (isFormDirty) {
      setShowDiscardConfirm(true)
      return
    }
    closeForm()
  }

  async function submit(values: ServiceFormValues): Promise<void> {
    setIsSubmitting(true)
    setServerError(null)
    try {
      if (formTarget === 'new') {
        await onCreate(toServiceInput(values))
      } else if (formTarget !== null) {
        await onUpdate(formTarget.id, toServiceInput(values))
      }
      closeForm()
    } catch (caughtError) {
      setServerError(
        mapApiErrorToForm(
          caughtError,
          serviceFieldMap,
          serviceCodeFieldMap,
          'Não foi possível salvar o serviço.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    onOpenCreate,
    onOpenEdit,
    editor: {
      isOpen: formTarget !== null,
      displayTarget,
      code: displayTarget === 'new' || displayTarget === null ? null : displayTarget.code,
      title: displayTarget === 'new' ? 'Novo serviço' : 'Editar serviço',
      submitLabel: displayTarget === 'new' ? 'Criar serviço' : 'Salvar alterações',
      isSubmitting,
      serverError,
      formTriggerRef,
      onRequestClose: requestCloseForm,
      onSubmit: submit,
      onDirtyChange: setIsFormDirty,
    },
    discardConfirmation: {
      isOpen: showDiscardConfirm,
      onCancel: () => {
        setShowDiscardConfirm(false)
      },
      onConfirm: closeForm,
    },
  }
}
