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
  const [confirmingId, setConfirmingId] = useState<string>();
  const isMountedRef = useRef(true);
  const shownIdRef = useRef(id);
  const isEdit = id !== undefined;
  const isLoading = isEdit && client?.id !== id;

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
    shownIdRef.current = id;
  }, [id]);

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
    const savedId = id;
    const result = isEdit
      ? await clientsRepository.update(id, values)
      : await clientsRepository.create(values);
    const isStillShown = isMountedRef.current && shownIdRef.current === savedId;

    if (result.ok) {
      toast.add({
        title: isEdit ? 'Pessoa atualizada' : 'Pessoa cadastrada',
        description: isEdit
          ? `O cadastro de ${result.data.fullName} foi atualizado.`
          : `O cadastro de ${result.data.fullName} foi criado.`,
        type: 'success',
      });
      if (isStillShown) void navigate(CLIENTS_PATH);
      return;
    }

    if (isStillShown) applyApiProblem(result.error, methods);
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) void methods.handleSubmit(onValid)(event);
  }

  function statusChangeOf(loaded: Client): ClientStatusChange {
    return {
      fullName: loaded.fullName,
      status: loaded.status,
      isConfirming: confirmingId === loaded.id,
      onOpen: () => {
        if (!isSaving) setConfirmingId(loaded.id);
      },
      onOpenChange: (open) => {
        setConfirmingId(open ? loaded.id : undefined);
      },
      onConfirm: () =>
        loaded.status === 'active'
          ? clientsRepository.deactivate(loaded.id)
          : clientsRepository.reactivate(loaded.id),
      onChanged: (changed) => {
        setClient((current) => (current?.id === changed.id ? changed : current));
      },
    };
  }

  return {
    status: isLoading ? ClientFormStatus.Loading : ClientFormStatus.Ready,
    methods,
    isSaving,
    canSubmit,
    statusChange: client && !isLoading ? statusChangeOf(client) : undefined,
    onSubmit: submit,
  };
}
