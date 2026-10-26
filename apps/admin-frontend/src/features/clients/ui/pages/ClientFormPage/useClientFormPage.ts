import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useParams } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applyApiProblem } from '@/shared/form/applyApiProblem';
import { useCloseRoute } from '@/shared/hooks/useCloseRoute';
import { toast } from '@/shared/ui/toast';
import { clientsRepository } from '../../../api/clientsRepository';
import type { ClientStatus } from '../../../model/clientStatus';
import { CLIENTS_PATH } from '../../clientsPaths';
import {
  clientFormSchema,
  emptyClientFormFieldValues,
  toClientFormFieldValues,
  type ClientFormFieldValues,
  type ClientFormValues,
} from './clientForm';
import {
  ClientFormStatus,
  type ClientStatusChange,
  type UseClientFormPageResult,
} from './useClientFormPage.types';

export function useClientFormPage(): UseClientFormPageResult {
  const { id } = useParams();
  const backToList = useCloseRoute(CLIENTS_PATH);
  const [isConfirming, setIsConfirming] = useState(false);
  const isMountedRef = useRef(true);
  const isEdit = id !== undefined;

  const methods = useForm<ClientFormFieldValues, unknown, ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: emptyClientFormFieldValues(),
  });
  const status = useWatch({ control: methods.control, name: 'status' });
  const isLoading = isEdit && status === undefined;
  const isSaving = methods.formState.isSubmitting;
  const canSubmit = !isLoading && !isSaving;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    void clientsRepository.get(id, controller.signal).then((result) => {
      if (controller.signal.aborted) return;

      if (result.ok) {
        methods.reset(toClientFormFieldValues(result.data));
        return;
      }

      toast.serverError('Não foi possível abrir a pessoa', result.error);
      backToList();
    });

    return () => {
      controller.abort();
    };
  }, [id, methods, backToList]);

  async function onValid(values: ClientFormValues) {
    const result = isEdit
      ? await clientsRepository.update(id, values)
      : await clientsRepository.create(values);

    if (result.ok) {
      toast.add({
        title: isEdit ? 'Pessoa atualizada' : 'Pessoa cadastrada',
        description: isEdit
          ? `O cadastro de ${result.data.fullName} foi atualizado.`
          : `O cadastro de ${result.data.fullName} foi criado.`,
        type: 'success',
      });
      if (isMountedRef.current) backToList();
      return;
    }

    applyApiProblem(result.error, methods);
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) void methods.handleSubmit(onValid)(event);
  }

  function statusChangeOf(clientId: string, current: ClientStatus): ClientStatusChange {
    return {
      fullName: methods.formState.defaultValues?.fullName ?? '',
      status: current,
      isConfirming,
      onOpen: () => setIsConfirming(true),
      onOpenChange: setIsConfirming,
      onConfirm: () =>
        current === 'active'
          ? clientsRepository.deactivate(clientId)
          : clientsRepository.reactivate(clientId),
      onChanged: (changed) => methods.setValue('status', changed.status),
    };
  }

  return {
    status: isLoading ? ClientFormStatus.Loading : ClientFormStatus.Ready,
    methods,
    isSaving,
    canSubmit,
    statusChange: isEdit && status !== undefined ? statusChangeOf(id, status) : undefined,
    onSubmit: submit,
    onCancel: backToList,
  };
}
