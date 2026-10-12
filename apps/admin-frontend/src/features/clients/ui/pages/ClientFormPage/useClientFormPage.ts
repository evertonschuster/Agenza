import { useEffect, useRef, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applyApiProblem } from '@/shared/form/applyApiProblem';
import { toast } from '@/shared/ui/toast';
import { clientsRepository } from '../../../api/clientsRepository';
import { CLIENTS_PATH } from '../../clientsPaths';
import {
  clientFormSchema,
  emptyClientFormFieldValues,
  type ClientFormFieldValues,
  type ClientFormValues,
} from './clientForm';
import type { UseClientFormPageResult } from './useClientFormPage.types';

export function useClientFormPage(): UseClientFormPageResult {
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  const methods = useForm<ClientFormFieldValues, unknown, ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: emptyClientFormFieldValues(),
  });
  const isSaving = methods.formState.isSubmitting;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function onValid(values: ClientFormValues) {
    const result = await clientsRepository.create(values);

    if (result.ok) {
      toast.add({
        title: 'Pessoa cadastrada',
        description: `O cadastro de ${result.data.fullName} foi criado.`,
        type: 'success',
      });
      if (isMountedRef.current) void navigate(CLIENTS_PATH);
      return;
    }

    applyApiProblem(result.error, methods);
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSaving) void methods.handleSubmit(onValid)(event);
  }

  return {
    methods,
    isSaving,
    onSubmit: submit,
  };
}
