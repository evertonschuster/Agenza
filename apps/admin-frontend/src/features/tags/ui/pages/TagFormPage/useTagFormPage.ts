import { useId, useState, type FormEvent } from 'react';
import { useLoaderData, useLocation, useNavigate, useRevalidator } from 'react-router';
import { toast } from '@/shared/ui/toast';
import type { ApiResult } from '@/shared/api/servicesFacade';
import { tagsRepository } from '../../../api/tagsRepository';
import type { Tag, TagLoadResult } from '../../../model/tag';
import {
  hasTagFormErrors,
  tagFormErrorsFromResult,
  validateTagForm,
  type TagFormErrors,
  type TagFormValues,
} from '../../../model/tagForm';

const EMPTY_VALUES: TagFormValues = { name: '', color: null, description: '' };

function valuesFromTag(tag: Tag): TagFormValues {
  return { name: tag.name, color: tag.color, description: tag.description ?? '' };
}

export type TagFormPageState =
  | { mode: 'not-found'; onClose: () => void }
  | { mode: 'error'; onClose: () => void; onRetry: () => void }
  | {
      mode: 'create' | 'edit';
      title: string;
      nameId: string;
      descriptionId: string;
      values: TagFormValues;
      setValues: (values: TagFormValues) => void;
      errors: TagFormErrors;
      generalError: string | undefined;
      isSubmitting: boolean;
      handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
      handleOpenChange: (open: boolean) => void;
    };

export function useTagFormPage(): TagFormPageState {
  // Only the ':id/edit' route entry has tagByIdLoader — 'new' has none, so this reads as
  // undefined there (React Router's own behavior for a route with no loader).
  const loaderData = useLoaderData<TagLoadResult | undefined>();
  const location = useLocation();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const nameId = useId();
  const descriptionId = useId();

  const tag = loaderData?.status === 'ready' ? loaderData.tag : undefined;

  const [values, setValues] = useState<TagFormValues>(() =>
    tag ? valuesFromTag(tag) : EMPTY_VALUES,
  );
  const [clientErrors, setClientErrors] = useState<TagFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiResult, setApiResult] = useState<ApiResult<Tag>>();

  const backTo = { pathname: '..', search: location.search };

  function handleOpenChange(open: boolean) {
    if (!open) void navigate(backTo);
  }

  if (loaderData?.status === 'not-found') {
    return { mode: 'not-found', onClose: () => void navigate(backTo) };
  }

  if (loaderData?.status === 'error') {
    return {
      mode: 'error',
      onClose: () => void navigate(backTo),
      onRetry: () => void revalidator.revalidate(),
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateTagForm(values);
    if (hasTagFormErrors(validation)) {
      setClientErrors(validation);
      return;
    }
    setClientErrors({});
    void saveTag();
  }

  async function saveTag() {
    const input = {
      name: values.name,
      color: values.color ?? '',
      description: values.description.trim() || null,
    };
    setIsSubmitting(true);
    const result = tag
      ? await tagsRepository.update(tag.id, input)
      : await tagsRepository.create(input);
    setIsSubmitting(false);
    setApiResult(result);

    if (result.ok) {
      const trimmedName = values.name.trim();
      toast.add({
        title: tag ? 'Etiqueta atualizada' : 'Etiqueta criada',
        description: tag
          ? `"${trimmedName}" foi atualizada.`
          : `"${trimmedName}" foi adicionada ao catálogo.`,
        type: 'success',
      });
      await revalidator.revalidate();
      void navigate(backTo);
    }
  }

  const hasClientErrors = hasTagFormErrors(clientErrors);
  const { fieldErrors: apiFieldErrors, generalError: apiGeneralError } =
    tagFormErrorsFromResult(apiResult);

  return {
    mode: tag ? 'edit' : 'create',
    title: tag ? 'Editar etiqueta' : 'Nova etiqueta',
    nameId,
    descriptionId,
    values,
    setValues,
    errors: hasClientErrors ? clientErrors : apiFieldErrors,
    generalError: hasClientErrors ? undefined : apiGeneralError,
    isSubmitting,
    handleSubmit,
    handleOpenChange,
  };
}
