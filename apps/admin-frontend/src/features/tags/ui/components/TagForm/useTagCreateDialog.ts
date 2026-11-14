import { useEffect, useRef, type SubmitEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applyApiProblem } from '@/shared/form/applyApiProblem';
import { toast } from '@/shared/ui/toast';
import { createTag } from '../../../application/tagUseCases';
import {
  tagFormSchema,
  toTagFormFieldValues,
  type TagFormFieldValues,
  type TagFormValues,
} from './tagForm';
import type { TagCreateDialogProps } from './TagCreateDialog.types';
import type { UseTagCreateDialogResult } from './useTagCreateDialog.types';

export function useTagCreateDialog(props: TagCreateDialogProps): UseTagCreateDialogResult {
  const { name, onCreated, onCancel } = props;
  const methods = useForm<TagFormFieldValues, unknown, TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: { ...toTagFormFieldValues(), name },
  });
  const isSaving = methods.formState.isSubmitting;
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function onValid(values: TagFormValues) {
    const result = await createTag(values);
    if (!isMountedRef.current) return;
    if (!result.ok) {
      applyApiProblem({ problem: result.error, methods });
      return;
    }

    toast.add({
      title: 'Etiqueta criada',
      description: `"${result.data.name}" foi criada e selecionada.`,
      type: 'success',
    });
    onCreated(result.data);
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSaving) void methods.handleSubmit(onValid)(event);
  }

  return {
    methods,
    isSaving,
    onOpenChange: (open) => {
      if (!open && !isSaving) onCancel();
    },
    onSubmit: submit,
  };
}
