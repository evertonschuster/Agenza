import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/shared/ui/toast';
import { applyApiProblem } from '@/shared/form/applyApiProblem';
import { tagsRepository } from '../../../api/tagsRepository';
import { tagSaved } from '../../../model/tagEvents';
import {
  TAG_FORM_FIELDS,
  tagFormSchema,
  type TagFormFieldValues,
  type TagFormValues,
} from '../../../model/tagForm';
import type { Tag } from '../../../model/tag';
import type { UseTagFormPageResult } from './useTagFormPage.types';

export function useTagFormPage(): UseTagFormPageResult | null {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const isEditRoute = params.id !== undefined;
  const stateTag = location.state as Tag | undefined;
  const notFound = isEditRoute && !stateTag;
  const tag = stateTag ?? null;

  const methods = useForm<TagFormFieldValues, unknown, TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: tag?.name ?? '',
      color: tag?.color ?? null,
      description: tag?.description ?? '',
    },
  });

  useEffect(() => {
    if (!notFound) return;
    toast.add({
      title: 'Etiqueta não encontrada',
      description: 'Ela pode ter sido excluída por outra pessoa, ou não corresponde à busca ativa.',
      type: 'info',
    });
    void navigate({ pathname: '/tags', search: location.search });
  }, [notFound, navigate, location.search]);

  if (notFound) return null;

  const backTo = { pathname: '/tags', search: location.search };

  function onOpenChange(open: boolean) {
    if (!open) void navigate(backTo);
  }

  async function onValid(values: TagFormValues) {
    const result = tag
      ? await tagsRepository.update(tag.id, values)
      : await tagsRepository.create(values);

    if (result.ok) {
      tagSaved.publish({ id: result.data.id });
      toast.add({
        title: tag ? 'Etiqueta atualizada' : 'Etiqueta criada',
        description: tag
          ? `"${result.data.name}" foi atualizada.`
          : `"${result.data.name}" foi adicionada ao catálogo.`,
        type: 'success',
      });
      void navigate(backTo);
      return;
    }

    applyApiProblem<TagFormFieldValues>(result.error, TAG_FORM_FIELDS, methods.setError);
  }

  const handleValidSubmit = methods.handleSubmit(onValid);

  return {
    tag,
    methods,
    onOpenChange,
    onSubmit: (event) => void handleValidSubmit(event),
  };
}
