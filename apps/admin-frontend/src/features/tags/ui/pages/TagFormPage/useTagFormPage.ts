import { useCallback, useEffect, useState, type SubmitEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useShortcut } from '@/shared/keyboard/useShortcut';
import { toast } from '@/shared/ui/toast';
import { applyApiProblem } from '@/shared/form/applyApiProblem';
import { tagsRepository } from '../../../api/tagsRepository';
import { tagSaved } from '../../../model/tagEvents';
import {
  TAG_FORM_FIELDS,
  tagFormSchema,
  toTagFormFieldValues,
  type TagFormFieldValues,
  type TagFormValues,
} from '../../../model/tagForm';
import { TagFormStatus, type UseTagFormPageResult } from './useTagFormPage.types';

export const SAVE_SHORTCUT_ID = 'salvar-etiqueta';

export function useTagFormPage(): UseTagFormPageResult {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loadedId, setLoadedId] = useState<string>();
  const isEdit = id !== undefined;
  const isLoading = isEdit && loadedId !== id;

  const methods = useForm<TagFormFieldValues, unknown, TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: toTagFormFieldValues(),
  });
  const isSaving = methods.formState.isSubmitting;
  const canSubmit = !isLoading && !isSaving;

  const close = useCallback(
    () => void navigate({ pathname: '/tags', search: location.search }),
    [navigate, location.search],
  );

  useEffect(() => {
    if (!id) return;
    let ignore = false;

    void tagsRepository.get(id).then((result) => {
      if (ignore) return;

      if (result.ok) {
        methods.reset(toTagFormFieldValues(result.data));
        setLoadedId(id);
        return;
      }

      toast.add({
        title: 'Não foi possível abrir a etiqueta',
        description: result.error.title ?? undefined,
        type: 'info',
      });
      close();
    });

    return () => {
      ignore = true;
    };
  }, [id, methods, close]);

  async function onValid(values: TagFormValues) {
    const result = isEdit
      ? await tagsRepository.update(id, values)
      : await tagsRepository.create(values);

    if (result.ok) {
      tagSaved.publish({ id: result.data.id });
      toast.add({
        title: isEdit ? 'Etiqueta atualizada' : 'Etiqueta criada',
        description: isEdit
          ? `"${result.data.name}" foi atualizada.`
          : `"${result.data.name}" foi adicionada ao catálogo.`,
        type: 'success',
      });
      close();
      return;
    }

    applyApiProblem<TagFormFieldValues>(result.error, TAG_FORM_FIELDS, methods.setError);
  }

  function submit(event?: SubmitEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (canSubmit) void methods.handleSubmit(onValid)(event);
  }

  useShortcut(SAVE_SHORTCUT_ID, 's', 'Salvar etiqueta', submit, { modified: true });

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
