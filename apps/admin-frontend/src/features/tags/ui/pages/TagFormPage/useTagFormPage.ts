import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCloseRoute } from '@/shared/hooks/useCloseRoute';
import { toast } from '@/shared/ui/toast';
import { applyApiProblem } from '@/shared/form/applyApiProblem';
import { tagsRepository } from '../../../api/tagsRepository';
import { createTag, updateTag } from '../../../application/tagUseCases';
import { TAGS_PATH } from '../../tagsPaths';
import {
  tagFormSchema,
  toTagFormFieldValues,
  type TagFormFieldValues,
  type TagFormValues,
} from './tagForm';
import { TagFormStatus, type UseTagFormPageResult } from './useTagFormPage.types';

export function useTagFormPage(): UseTagFormPageResult {
  const { id } = useParams();
  const close = useCloseRoute(TAGS_PATH);
  const [loadedId, setLoadedId] = useState<string>();
  const isMountedRef = useRef(true);
  const isEdit = id !== undefined;
  const isLoading = isEdit && loadedId !== id;

  const methods = useForm<TagFormFieldValues, unknown, TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: toTagFormFieldValues(),
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

    void tagsRepository.get(id, controller.signal).then((result) => {
      if (controller.signal.aborted) return;

      if (result.ok) {
        methods.reset(toTagFormFieldValues(result.data));
        setLoadedId(id);
        return;
      }

      toast.serverError('Não foi possível abrir a etiqueta', result.error);
      close();
    });

    return () => {
      controller.abort();
    };
  }, [id, methods, close]);

  async function onValid(values: TagFormValues) {
    const result = isEdit ? await updateTag(id, values) : await createTag(values);

    if (result.ok) {
      toast.add({
        title: isEdit ? 'Etiqueta atualizada' : 'Etiqueta criada',
        description: isEdit
          ? `"${result.data.name}" foi atualizada.`
          : `"${result.data.name}" foi adicionada ao catálogo.`,
        type: 'success',
      });
      if (isMountedRef.current) close();
      return;
    }

    applyApiProblem(result.error, methods);
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) void methods.handleSubmit(onValid)(event);
  }

  return {
    status: isLoading ? TagFormStatus.Loading : TagFormStatus.Ready,
    isEdit,
    isSaving,
    canSubmit,
    methods,
    onOpenChange: (open) => {
      if (!open && !isSaving) close();
    },
    onSubmit: submit,
  };
}
