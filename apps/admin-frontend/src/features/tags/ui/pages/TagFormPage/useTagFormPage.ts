import { useEffect, useState } from 'react';
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
import { TagFormStatus, type UseTagFormPageResult } from './useTagFormPage.types';

export function useTagFormPage(): UseTagFormPageResult {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id;
  const isEditRoute = id !== undefined;
  const backTo = { pathname: '/tags', search: location.search };

  const [tag, setTag] = useState<Tag | null>(null);
  const [phase, setPhase] = useState<TagFormStatus>(
    isEditRoute ? TagFormStatus.Loading : TagFormStatus.Ready,
  );

  const methods = useForm<TagFormFieldValues, unknown, TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: { name: '', color: null, description: '' },
  });

  function onOpenChange(open: boolean) {
    if (!open) void navigate(backTo);
  }

  useEffect(() => {
    if (!id) return;
    let ignore = false;

    void tagsRepository.get(id).then((result) => {
      if (ignore) return;

      if (result.ok) {
        setTag(result.data);
        methods.reset({
          name: result.data.name,
          color: result.data.color,
          description: result.data.description ?? '',
        });
        setPhase(TagFormStatus.Ready);
        return;
      }

      toast.add({
        title: 'Não foi possível abrir a etiqueta',
        description: result.error.title ?? undefined,
        type: 'info',
      });
      void navigate({ pathname: '/tags', search: location.search });
    });

    return () => {
      ignore = true;
    };
  }, [id, location.search, methods, navigate]);

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
    status: phase,
    tag,
    methods,
    onOpenChange,
    onSubmit: (event) => void handleValidSubmit(event),
  };
}
