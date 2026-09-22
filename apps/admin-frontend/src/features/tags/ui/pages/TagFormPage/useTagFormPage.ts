import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { toast } from '@/shared/ui/toast';
import { tagsRepository } from '../../../api/tagsRepository';
import { tagSaved } from '../../../model/tagEvents';
import { toTagFormErrors, validateTagForm, type TagFormErrors } from '../../../model/tagForm';
import type { Tag } from '../../../model/tag';
import type { UseTagFormPageResult } from './useTagFormPage.types';

export function useTagFormPage(): UseTagFormPageResult | null {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const isEditRoute = params.id !== undefined;
  const stateTag = location.state as Tag | undefined;
  const notFound = isEditRoute && !stateTag;

  const [color, setColor] = useState<string | null>(stateTag?.color ?? null);
  const [fieldErrors, setFieldErrors] = useState<TagFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const tag = stateTag ?? null;
  const backTo = { pathname: '/tags', search: location.search };

  function onOpenChange(open: boolean) {
    if (!open) void navigate(backTo);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nameValue = formData.get('name');
    const descriptionValue = formData.get('description');
    const name = typeof nameValue === 'string' ? nameValue : '';
    const description = typeof descriptionValue === 'string' ? descriptionValue : '';

    const validationErrors = validateTagForm({ name, color, description });
    if (Object.keys(validationErrors).length > 0 || color === null) {
      setFieldErrors(validationErrors);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const input = { name: name.trim(), color, description: description.trim() || null };
    const result = tag
      ? await tagsRepository.update(tag.id, input)
      : await tagsRepository.create(input);

    setIsSubmitting(false);

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

    const mapped = toTagFormErrors(result.error);
    setFieldErrors(mapped.fieldErrors);
    setFormError(mapped.formError);
  }

  return {
    tag,
    color,
    onColorChange: setColor,
    fieldErrors,
    formError,
    isSubmitting,
    onOpenChange,
    onSubmit: (event) => void onSubmit(event),
  };
}
