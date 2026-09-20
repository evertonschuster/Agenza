import { extractErrorMessage, type ApiResult } from '@/shared/api/servicesFacade';
import type { TagInput } from './tag';

export type TagFormValues = Omit<TagInput, 'color' | 'description'> & {
  color: string | null;
  description: string;
};

export const EMPTY_TAG_FORM_VALUES: TagFormValues = { name: '', color: null, description: '' };

export interface TagFormErrors {
  name?: string | undefined;
  color?: string | undefined;
  description?: string | undefined;
}

const NAME_MAX_LENGTH = 40;
const DESCRIPTION_MAX_LENGTH = 200;

export function validateTagForm(values: TagFormValues): TagFormErrors {
  const errors: TagFormErrors = {};
  const trimmedName = values.name.trim();

  if (!trimmedName) {
    errors.name = 'O nome da etiqueta é obrigatório.';
  } else if (trimmedName.length > NAME_MAX_LENGTH) {
    errors.name = `O nome da etiqueta deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`;
  }

  if (!values.color) {
    errors.color = 'A cor da etiqueta é obrigatória.';
  }

  if (values.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `A descrição da etiqueta deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`;
  }

  return errors;
}

export function hasTagFormErrors(errors: TagFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function tagFormErrorsFromResult<T>(result: ApiResult<T> | undefined): {
  fieldErrors: TagFormErrors;
  generalError: string | undefined;
} {
  if (!result || result.ok) {
    return { fieldErrors: {}, generalError: undefined };
  }
  const byField = result.error.errors;
  return {
    fieldErrors: {
      name: byField?.['Name']?.[0]?.message,
      color: byField?.['Color']?.[0]?.message,
      description: byField?.['Description']?.[0]?.message,
    },
    generalError:
      byField?.['']?.[0]?.message ?? (byField ? undefined : extractErrorMessage(result.error)),
  };
}
