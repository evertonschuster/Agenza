import type { SubmitEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applyApiProblem } from '@/shared/form/applyApiProblem';
import { useIsMounted } from '@/shared/hooks/useIsMounted';
import { toast } from '@/shared/ui/toast';
import { createTag } from '../../../application/tagUseCases';
import { TAG_NAME_MAX_LENGTH } from '../../../model/tag';
import {
  tagFormSchema,
  toTagFormFieldValues,
  type TagFormFieldValues,
  type TagFormValues,
} from '../../components/TagForm/tagForm';
import type { TagCreationDialogProps } from './TagCreationDialog.types';
import type { UseTagCreationDialogResult } from './useTagCreationDialog.types';

export function useTagCreationDialog(props: TagCreationDialogProps): UseTagCreationDialogResult {
  const { name, onCreated, onCancel } = props;
  const methods = useForm<TagFormFieldValues, unknown, TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: { ...toTagFormFieldValues(), name: name.slice(0, TAG_NAME_MAX_LENGTH) },
  });
  const isSaving = methods.formState.isSubmitting;
  const isMountedRef = useIsMounted();

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
