import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applyApiProblem } from '@/shared/form/applyApiProblem';
import { toast } from '@/shared/ui/toast';
import { clientsRepository } from '../../../api/clientsRepository';
import type { Client } from '../../../model/client';
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
  const navigate = useNavigate();
  const [client, setClient] = useState<Client>();
  const [isConfirming, setIsConfirming] = useState(false);
  const isMountedRef = useRef(true);
  const isEdit = id !== undefined;
  const isLoading = isEdit && client === undefined;

  const methods = useForm<ClientFormFieldValues, unknown, ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: emptyClientFormFieldValues(),
  });
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
        setClient(result.data);
        return;
      }

      toast.serverError('Não foi possível abrir a pessoa', result.error);
      void navigate(CLIENTS_PATH, { replace: true });
    });

    return () => {
      controller.abort();
    };
  }, [id, methods, navigate]);

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
      if (isMountedRef.current) void navigate(CLIENTS_PATH);
      return;
    }

    applyApiProblem(result.error, methods);
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) void methods.handleSubmit(onValid)(event);
  }

  function statusChangeOf(loaded: Client): ClientStatusChange {
    return {
      fullName: loaded.fullName,
      status: loaded.status,
      isConfirming,
      onOpen: () => setIsConfirming(true),
      onOpenChange: setIsConfirming,
      onConfirm: () =>
        loaded.status === 'active'
          ? clientsRepository.deactivate(loaded.id)
          : clientsRepository.reactivate(loaded.id),
      onChanged: setClient,
    };
  }

  return {
    status: isLoading ? ClientFormStatus.Loading : ClientFormStatus.Ready,
    isEdit,
    methods,
    isSaving,
    canSubmit,
    statusChange: client ? statusChangeOf(client) : undefined,
    onSubmit: submit,
  };
}
